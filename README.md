# Philips Coveo Listing page POC

This project is a fork from: https://github.com/coveo/ui-kit/tree/master/packages/samples/headless-commerce-react package in order to test Coveo product listing functionality.

> Important: Please do not use this code on production!

## Getting Started

Create a `env.local` properties file based on the `env.sample` file and fill out the necessary environment variables.

```bash
npm run build
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project details

Available Coveo properties are managed in `src/types/types.ts`:

**Using real data:**

- acc.philips.ca
- acc.philips.ca/fr
- acc.philips.ie
- acc.philips.co.uk

Uses Coveo out of the box deeplinking

**Using dummy data:**

- poc.acc.philps.ca

Uses custom deeplinking (#filters) fragment pattern
