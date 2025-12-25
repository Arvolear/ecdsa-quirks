# ECDSA Quirks

A simple command line tool to generate the same ECDSA signature for two different messages.

## Install

```bash
npm install -g ecdsa-quirks
```

## How to use

To generate the signatures, run:

```bash
ecdsa-quirks --m1 "<some message>" --m2 "<some other message>" [--eip191]
```

The tool will log the private key and generated signatures via that private key that are the same for the specified messages.

> [!CAUTION]
> If both messages (or their hashes) with the signature are disclosed, anyone can reconstruct the private key. Be extremely cautious.

## Disclaimer

The implementation is based on [this research paper](https://www.di.ens.fr/david.pointcheval/Documents/Papers/2002_cryptoA.pdf). Please check it out to understand the math behind.
