;; Title: StacksFund - Decentralized Fund Management Protocol
;;
;; Summary:
;; A sophisticated decentralized fund management protocol built on Stacks,
;; enabling transparent governance, secure asset management, and democratic
;; decision-making through a robust proposal system.
;;
;; Description:
;; StacksFund revolutionizes decentralized fund management by implementing
;; a comprehensive suite of features:
;; - Secure deposit and withdrawal mechanisms with time-locks
;; - Democratic proposal creation and voting system
;; - Proportional voting power based on token holdings
;; - Automated proposal execution with multi-layer security checks
;; - Built-in protection against common attack vectors
;;
;; Contract Architecture:
;; 1. Core Management: Initialization and owner controls
;; 2. Fund Operations: Deposits, withdrawals, and balance management
;; 3. Governance: Proposal creation, voting, and execution
;; 4. Security: Multiple validation layers and access controls
;; 5. Utility: Read-only functions for contract interaction

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-initialized (err u101))
(define-constant err-already-initialized (err u102))
(define-constant err-insufficient-balance (err u103))
(define-constant err-invalid-amount (err u104))
(define-constant err-unauthorized (err u105))
(define-constant err-proposal-not-found (err u106))
(define-constant err-proposal-expired (err u107))
(define-constant err-already-voted (err u108))
(define-constant err-below-minimum (err u109))
(define-constant err-locked-period (err u110))
(define-constant err-transfer-failed (err u111))
(define-constant err-invalid-duration (err u112))
(define-constant err-zero-amount (err u113))
(define-constant err-invalid-target (err u114))
(define-constant err-invalid-description (err u115))
(define-constant err-invalid-proposal-id (err u116))
(define-constant err-invalid-vote (err u117))
(define-constant minimum-duration u144) ;; minimum 1 day (assuming 10min blocks)
(define-constant maximum-duration u20160) ;; maximum 14 days

;; Data Variables
(define-data-var total-supply uint u0)
(define-data-var minimum-deposit uint u1000000) ;; in microSTX
(define-data-var lock-period uint u1440) ;; ~10 days in blocks
(define-data-var initialized bool false)
(define-data-var last-rebalance uint u0)
(define-data-var proposal-count uint u0)

;; Data Maps
(define-map balances principal uint)
(define-map deposits
    principal
    {
        amount: uint,
        lock-until: uint,
        last-reward-block: uint
    }
)

(define-map proposals
    uint
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
)

(define-map votes {proposal-id: uint, voter: principal} bool)

;; Private Functions
(define-private (is-contract-owner)
    (is-eq tx-sender contract-owner)
)

(define-private (check-initialized)
    (ok (asserts! (var-get initialized) err-not-initialized))
)

(define-private (validate-proposal-id (proposal-id uint))
    (ok (asserts! (<= proposal-id (var-get proposal-count)) err-invalid-proposal-id))
)

(define-private (calculate-voting-power (voter principal))
    (default-to u0 (map-get? balances voter))
)

(define-private (transfer-tokens (sender principal) (recipient principal) (amount uint))
    (let (
        (sender-balance (default-to u0 (map-get? balances sender)))
        (recipient-balance (default-to u0 (map-get? balances recipient)))
    )
        (asserts! (>= sender-balance amount) err-insufficient-balance)
        (map-set balances sender (- sender-balance amount))
        (map-set balances recipient (+ recipient-balance amount))
        (ok true)
    )
)

(define-private (mint-tokens (account principal) (amount uint))
    (let (
        (current-balance (default-to u0 (map-get? balances account)))
    )
        (map-set balances account (+ current-balance amount))
        (var-set total-supply (+ (var-get total-supply) amount))
        (ok true)
    )
)

(define-private (burn-tokens (account principal) (amount uint))
    (let (
        (current-balance (default-to u0 (map-get? balances account)))
    )
        (asserts! (>= current-balance amount) err-insufficient-balance)
        (map-set balances account (- current-balance amount))
        (var-set total-supply (- (var-get total-supply) amount))
        (ok true)
    )
)

;; Public Functions
(define-public (initialize)
    (begin
        (asserts! (is-contract-owner) err-owner-only)
        (asserts! (not (var-get initialized)) err-already-initialized)
        (var-set initialized true)
        (ok true)
    )
)

(define-public (deposit (amount uint))
    (begin
        (try! (check-initialized))
        (asserts! (>= amount (var-get minimum-deposit)) err-below-minimum)
        (asserts! (> amount u0) err-zero-amount)

        ;; Transfer STX to contract
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        
        ;; Update deposit records
        (map-set deposits tx-sender {
            amount: amount,
            lock-until: (+ block-height (var-get lock-period)),
            last-reward-block: block-height
        })
        
        ;; Mint fund tokens
        (mint-tokens tx-sender amount)
    )
)

(define-public (withdraw (amount uint))
    (begin
        (try! (check-initialized))
        (asserts! (> amount u0) err-zero-amount)

        (let (
            (deposit-info (unwrap! (map-get? deposits tx-sender) err-unauthorized))
            (user-balance (unwrap! (get-balance tx-sender) err-unauthorized))
        )
            (asserts! (>= block-height (get lock-until deposit-info)) err-locked-period)
            (asserts! (>= user-balance amount) err-insufficient-balance)
            
            ;; Burn tokens first
            (try! (burn-tokens tx-sender amount))
            
            ;; Transfer STX back to user
            (as-contract (stx-transfer? amount (as-contract tx-sender) tx-sender))
        )
    )
)

(define-public (create-proposal
    (description (string-ascii 256))
    (amount uint)
    (target principal)
    (duration uint)
)
    (begin
        (try! (check-initialized))

        ;; Input validation
        (asserts! (> (len description) u0) err-invalid-description)
        (asserts! (> amount u0) err-zero-amount)
        (asserts! (not (is-eq target (as-contract tx-sender))) err-invalid-target)
        (asserts! (and (>= duration minimum-duration) (<= duration maximum-duration)) err-invalid-duration)
        
        (let (
            (proposer-balance (unwrap! (map-get? balances tx-sender) err-unauthorized))
            (proposal-id (+ (var-get proposal-count) u1))
        )
            (asserts! (> proposer-balance u0) err-unauthorized)
            
            ;; Create new proposal with validated inputs
            (map-set proposals proposal-id {
                proposer: tx-sender,
                description: description,
                amount: amount,
                target: target,
                expires-at: (+ block-height duration),
                executed: false,
                yes-votes: u0,
                no-votes: u0
            })
            
            (var-set proposal-count proposal-id)
            (ok proposal-id)
        )
    )
)
