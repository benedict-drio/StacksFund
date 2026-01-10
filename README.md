# StacksFund Protocol

A sophisticated decentralized fund management protocol built on the Stacks blockchain, enabling transparent governance, secure asset management, and democratic decision-making.

## Overview

StacksFund revolutionizes decentralized fund management by implementing a comprehensive suite of features that enable secure, transparent, and democratic fund management. The protocol allows users to deposit STX tokens, participate in governance through proposals, and vote on fund allocation decisions.

## Key Features

- **Secure Asset Management**

  - Time-locked deposits with a 10-day minimum holding period
  - Automated token minting and burning mechanisms
  - Secure withdrawal system with multiple validation layers

- **Democratic Governance**

  - Proposal creation system for fund allocation
  - Voting power proportional to token holdings
  - Configurable proposal duration (1-14 days)
  - Automated proposal execution based on voting outcomes

- **Security Measures**
  - Multi-layer validation checks
  - Built-in protection against common attack vectors
  - Owner-controlled initialization
  - Comprehensive error handling

## Technical Specifications

### Constants

- Minimum deposit: 1,000,000 microSTX
- Lock period: 1,440 blocks (~10 days)
- Minimum proposal duration: 144 blocks (~1 day)
- Maximum proposal duration: 20,160 blocks (~14 days)

### Core Functions

#### Deposit Management

```clarity
(define-public (deposit (amount uint)))
(define-public (withdraw (amount uint)))
```

- Handles secure token deposits and withdrawals
- Implements time-lock mechanism
- Manages token minting and burning

#### Proposal System

```clarity
(define-public (create-proposal
    (description (string-ascii 256))
    (amount uint)
    (target principal)
    (duration uint)
))
```

- Creates governance proposals
- Validates proposal parameters
- Manages proposal lifecycle

#### Voting Mechanism

```clarity
(define-public (vote (proposal-id uint) (vote-for bool)))
```

- Enables token-weighted voting
- Prevents double voting
- Updates proposal vote counts

#### Proposal Execution

```clarity
(define-public (execute-proposal (proposal-id uint)))
```

- Automated execution of approved proposals
- Validates execution conditions
- Handles fund transfers

### Data Structures

#### Deposits

```clarity
{
    amount: uint,
    lock-until: uint,
    last-reward-block: uint
}
```

#### Proposals

```clarity
{
    proposer: principal,
    description: (string-ascii 256),
    amount: uint,
    target: principal,
    expires-at: uint,
    executed: bool,
    yes-votes: uint,
    no-votes: uint
}
```

## Error Handling

The contract includes comprehensive error handling for various scenarios:

- `err-owner-only`: Unauthorized owner access
- `err-not-initialized`: Contract not initialized
- `err-insufficient-balance`: Insufficient funds
- `err-locked-period`: Funds still in lock period
- `err-proposal-expired`: Proposal voting period ended
- `err-already-voted`: Duplicate vote attempt
- And more...

## Usage Examples

### Depositing Funds

```clarity
;; Deposit 2,000,000 microSTX
(contract-call? .stacks-fund deposit u2000000)
```

### Creating a Proposal

```clarity
;; Create a proposal for 1,000,000 microSTX with 3-day duration
(contract-call? .stacks-fund create-proposal
    "Fund development of new feature"
    u1000000
    'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
    u432)
```

### Voting on Proposals

```clarity
;; Vote in favor of proposal #1
(contract-call? .stacks-fund vote u1 true)
```

## Security Considerations

1. **Time-Lock Mechanism**

   - Deposits are locked for 10 days
   - Prevents rapid deposit/withdrawal attacks
   - Ensures stability of the fund

2. **Voting Power**

   - Based on token holdings
   - Prevents vote manipulation
   - Ensures fair governance

3. **Proposal Validation**

   - Multiple security checks
   - Duration limits
   - Amount validation
   - Target address verification

4. **Access Control**
   - Owner-controlled initialization
   - Function-level access restrictions
   - Balance verification

## Best Practices

1. **For Users**

   - Verify proposal details before voting
   - Understand lock period requirements
   - Check voting power before creating proposals

2. **For Integrators**
   - Implement proper error handling
   - Verify transaction success
   - Monitor proposal status
   - Track voting deadlines

## Contributing

We welcome contributions to improve the StacksFund protocol. Please ensure:

1. Comprehensive testing of changes
2. Detailed documentation updates
3. Adherence to security best practices
4. Clear commit messages
