import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vesting } from "../target/types/vesting";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";

describe("vesting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Vesting as Program<Vesting>;
  const connection = provider.connection;
  const wallet = provider.wallet as anchor.Wallet;

  let mint: anchor.web3.PublicKey;
  let companyOwner: anchor.web3.Keypair;
  let employee1: anchor.web3.Keypair;
  let employee2: anchor.web3.Keypair;

  let vestingAccount: anchor.web3.PublicKey;
  let treasuryTokenAccount: anchor.web3.PublicKey;
  let employee1Account: anchor.web3.PublicKey;
  let employee2Account: anchor.web3.PublicKey;

  const companyName = "Solana Corp";
  const TOKENS_PER_INTERVAL = 100;
  const TOTAL_AMOUNT_1 = 1000;
  const TOTAL_AMOUNT_2 = 2000;

  before(async () => {
    companyOwner = anchor.web3.Keypair.generate();
    employee1 = anchor.web3.Keypair.generate();
    employee2 = anchor.web3.Keypair.generate();

    await connection.requestAirdrop(companyOwner.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.requestAirdrop(employee1.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.requestAirdrop(employee2.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);

    await new Promise(resolve => setTimeout(resolve, 2000));

    mint = await createMint(
      connection,
      wallet.payer,
      companyOwner.publicKey,
      null,
      6
    );

    [vestingAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vesting"), Buffer.from(companyName)],
      program.programId
    );

    [treasuryTokenAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vesting_treasury"), Buffer.from(companyName)],
      program.programId
    );

    [employee1Account] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("employee_vesting"), employee1.publicKey.toBuffer(), vestingAccount.toBuffer()],
      program.programId
    );

    [employee2Account] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("employee_vesting"), employee2.publicKey.toBuffer(), vestingAccount.toBuffer()],
      program.programId
    );
  });

  it("Creates a vesting account", async () => {
    const tx = await program.methods
      .createVesting(companyName)
      .accountsPartial({
        signer: companyOwner.publicKey,
        vesting: vestingAccount,
        mint: mint,
        treasuryTokenAccount: treasuryTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([companyOwner])
      .rpc();

    console.log("Create vesting transaction signature", tx);

    const vestingAccountData = await program.account.vesting.fetch(vestingAccount);
    expect(vestingAccountData.owner.toString()).to.equal(companyOwner.publicKey.toString());
    expect(vestingAccountData.mint.toString()).to.equal(mint.toString());
    expect(vestingAccountData.companyName).to.equal(companyName);
    expect(vestingAccountData.treasuryTokenAccount.toString()).to.equal(treasuryTokenAccount.toString());

    await mintTo(
      connection,
      wallet.payer,
      mint,
      treasuryTokenAccount,
      companyOwner.publicKey,
      10000 * Math.pow(10, 6),
      [companyOwner]
    );
  });

  it("Creates employee vesting schedules", async () => {
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - 10;
    const cliffTime = now + 5;
    const endTime = now + 30;

    const tx1 = await program.methods
      .createEmployee(
        new anchor.BN(startTime),
        new anchor.BN(endTime),
        new anchor.BN(cliffTime),
        new anchor.BN(TOTAL_AMOUNT_1)
      )
      .accountsPartial({
        owner: companyOwner.publicKey,
        beneficiary: employee1.publicKey,
        vesting: vestingAccount,
        employee: employee1Account,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([companyOwner])
      .rpc();

    console.log("Create employee 1 transaction signature", tx1);

    const tx2 = await program.methods
      .createEmployee(
        new anchor.BN(startTime),
        new anchor.BN(endTime),
        new anchor.BN(cliffTime),
        new anchor.BN(TOTAL_AMOUNT_2)
      )
      .accountsPartial({
        owner: companyOwner.publicKey,
        beneficiary: employee2.publicKey,
        vesting: vestingAccount,
        employee: employee2Account,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([companyOwner])
      .rpc();

    console.log("Create employee 2 transaction signature", tx2);

    const employee1Data = await program.account.employee.fetch(employee1Account);
    expect(employee1Data.beneficiary.toString()).to.equal(employee1.publicKey.toString());
    expect(employee1Data.totalAmount.toNumber()).to.equal(TOTAL_AMOUNT_1);
    expect(employee1Data.totalWithdrawn.toNumber()).to.equal(0);

    const employee2Data = await program.account.employee.fetch(employee2Account);
    expect(employee2Data.beneficiary.toString()).to.equal(employee2.publicKey.toString());
    expect(employee2Data.totalAmount.toNumber()).to.equal(TOTAL_AMOUNT_2);
    expect(employee2Data.totalWithdrawn.toNumber()).to.equal(0);
  });

  it("Fails to claim tokens before cliff period", async () => {
    try {
      const employeeTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        employee1,
        mint,
        employee1.publicKey
      );

      await program.methods
        .claimTokens(companyName)
        .accountsPartial({
          beneficiary: employee1.publicKey,
          employee: employee1Account,
          vesting: vestingAccount,
          mint: mint,
          treasuryTokenAccount: treasuryTokenAccount,
          employeeTokenAccount: employeeTokenAccount.address,
          associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([employee1])
        .rpc();

      expect.fail("Expected error was not thrown");
    } catch (error: unknown) {
      if (error instanceof Error) {
        expect(error.message).to.include("ClaimNotAvailableYet");
      } else {
        throw new Error("Caught non-Error exception");
      }
    }
  });

  it("Successfully claims tokens after cliff period", async () => {
    console.log("Waiting for cliff period to pass...");
    await new Promise(resolve => setTimeout(resolve, 6000));

    const employeeTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      employee1,
      mint,
      employee1.publicKey
    );

    const tx = await program.methods
      .claimTokens(companyName)
      .accountsPartial({
        beneficiary: employee1.publicKey,
        employee: employee1Account,
        vesting: vestingAccount,
        mint: mint,
        treasuryTokenAccount: treasuryTokenAccount,
        employeeTokenAccount: employeeTokenAccount.address,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([employee1])
      .rpc();

    console.log("Claim tokens transaction signature", tx);

    const tokenAccountInfo = await getAccount(connection, employeeTokenAccount.address);
    expect(Number(tokenAccountInfo.amount)).to.be.greaterThan(0);

    const employeeData = await program.account.employee.fetch(employee1Account);
    expect(employeeData.totalWithdrawn.toNumber()).to.be.greaterThan(0);
  });

  it("Claims progressive vesting over time", async () => {
    console.log("Waiting for additional vesting...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    const employeeTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      employee1,
      mint,
      employee1.publicKey
    );

    const initialBalance = await getAccount(connection, employeeTokenAccount.address);
    const initialEmployeeData = await program.account.employee.fetch(employee1Account);

    const tx = await program.methods
      .claimTokens(companyName)
      .accountsPartial({
        beneficiary: employee1.publicKey,
        employee: employee1Account,
        vesting: vestingAccount,
        mint: mint,
        treasuryTokenAccount: treasuryTokenAccount,
        employeeTokenAccount: employeeTokenAccount.address,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([employee1])
      .rpc();

    console.log("Second claim transaction signature", tx);

    const finalBalance = await getAccount(connection, employeeTokenAccount.address);
    const finalEmployeeData = await program.account.employee.fetch(employee1Account);

    expect(Number(finalBalance.amount)).to.be.greaterThan(Number(initialBalance.amount));
    expect(finalEmployeeData.totalWithdrawn.toNumber()).to.be.greaterThan(initialEmployeeData.totalWithdrawn.toNumber());
  });

  it("Employee 2 can also claim their vested tokens", async () => {
    const employeeTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      employee2,
      mint,
      employee2.publicKey
    );

    const tx = await program.methods
      .claimTokens(companyName)
      .accountsPartial({
        beneficiary: employee2.publicKey,
        employee: employee2Account,
        vesting: vestingAccount,
        mint: mint,
        treasuryTokenAccount: treasuryTokenAccount,
        employeeTokenAccount: employeeTokenAccount.address,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([employee2])
      .rpc();

    console.log("Employee 2 claim transaction signature", tx);

    const tokenAccountInfo = await getAccount(connection, employeeTokenAccount.address);
    expect(Number(tokenAccountInfo.amount)).to.be.greaterThan(0);

    const employeeData = await program.account.employee.fetch(employee2Account);
    expect(employeeData.totalWithdrawn.toNumber()).to.be.greaterThan(0);
  });
});