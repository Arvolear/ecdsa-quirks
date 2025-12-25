#!/usr/bin/env node

import { ethers } from "ethers";

// eslint-disable-next-line
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { modInv } from "bigint-mod-arith";

import { Command } from "commander";
import { expect } from "chai";

type Quirked = {
  privateKey: string;
  address: string;
  signature1: string;
  signature2: string;
};

// based on https://www.di.ens.fr/david.pointcheval/Documents/Papers/2002_cryptoA.pdf
function quirk(message1: string, message2: string, eip191: boolean): Quirked {
  let message1Hash;
  let message2Hash;

  // EIP-191 hash
  if (eip191) {
    message1Hash = ethers.hashMessage(message1);
    message2Hash = ethers.hashMessage(message2);
  } else {
    message1Hash = ethers.keccak256(ethers.toUtf8Bytes(message1));
    message2Hash = ethers.keccak256(ethers.toUtf8Bytes(message2));
  }

  const n = secp256k1.Point.CURVE().n;
  const k = ethers.hexlify(ethers.randomBytes(32));
  const r = "0x" + ethers.hexlify(secp256k1.getPublicKey(Buffer.from(k.slice(2), "hex"))).slice(4); // take x coordinate

  // x = -((h1 + h2) / 2r) (mod n)
  const numer = BigInt(message1Hash) + BigInt(message2Hash);
  const denom = BigInt(modInv(2n * BigInt(r), BigInt(n)));
  const x = BigInt(n) - ((numer * denom) % BigInt(n));

  // regular ECDSA signature
  let s =
    (BigInt(modInv(BigInt(k), BigInt(n))) * (BigInt(message1Hash) + x * BigInt(r))) % BigInt(n);

  // make s be from the lower part of the curve
  if (s > n / 2n) {
    s = n - s;
  }

  const wallet = new ethers.Wallet(ethers.toBeHex(x, 32));

  let sig1 = ethers.toBeHex(r, 32) + ethers.toBeHex(s, 32).slice(2) + "1b";
  let sig2 = ethers.toBeHex(r, 32) + ethers.toBeHex(s, 32).slice(2) + "1c";

  if (ethers.recoverAddress(message1Hash, sig1) != wallet.address) {
    const tmp = sig1;
    sig1 = sig2;
    sig2 = tmp;
  }

  // sanity check
  expect(ethers.recoverAddress(message1Hash, sig1)).to.eq(wallet.address);
  expect(ethers.recoverAddress(message2Hash, sig2)).to.eq(wallet.address);

  return {
    privateKey: ethers.toBeHex(x, 32),
    address: wallet.address,
    signature1: sig1,
    signature2: sig2,
  };
}

function printQuirked(message1: string, message2: string, quirked: Quirked) {
  console.log("Private key: " + quirked.privateKey);
  console.log("Address: " + quirked.address);

  console.log();

  console.log("Message1: " + message1);
  console.log("Signature1: " + quirked.signature1);

  console.log();

  console.log("Message2: " + message2);
  console.log("Signature2: " + quirked.signature2);
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("ecdsa-quirks")
    .description("Generate the same ECDSA signature for two different messages")
    .option("--m1, --message1 <MSG>", "The first message")
    .option("--m2, --message2 <MSG>", "The second message")
    .option("--eip191", "Whether to EIP-191 hash the messages before signing", false)
    .showHelpAfterError();

  try {
    const parsed = await program.parseAsync(process.argv);
    const opts = parsed.opts<{
      message1: string;
      message2: string;
      eip191: boolean;
    }>();

    if (!opts.message1 || !opts.message2) {
      throw new Error("Specify both messages to generate the signature for");
    }

    const quirked = quirk(opts.message1, opts.message2, opts.eip191);
    printQuirked(opts.message1, opts.message2, quirked);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    throw new Error(msg);
  }
}

void main();
