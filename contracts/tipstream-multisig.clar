;; TipStream Multisig Contract
;; A simple multisig governance contract for testing multisig functionality
;; This contract is for testing purposes only

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_OWNER_ONLY (err u200))
(define-constant ERR_NOT_SIGNER (err u201))
(define-constant ERR_ALREADY_SIGNER (err u202))
(define-constant ERR_PROPOSAL_NOT_FOUND (err u203))
(define-constant ERR_ALREADY_SIGNED (err u204))
(define-constant ERR_INSUFFICIENT_SIGNATURES (err u1104))
(define-constant ERR_PROPOSAL_EXECUTED (err u206))

;; Data Variables
(define-data-var required-signatures uint u2)
(define-data-var proposal-nonce uint u0)

;; Data Maps
(define-map signers principal bool)
(define-map proposals 
    uint 
    {
        description: (string-utf8 256),
        action: (string-ascii 32),
        value: uint,
        executed: bool,
        signature-count: uint
    }
)
(define-map proposal-signatures { proposal-id: uint, signer: principal } bool)

;; Initialize owner as signer
(map-set signers CONTRACT_OWNER true)

;; Read-only Functions

(define-read-only (is-signer (account principal))
    (default-to false (map-get? signers account))
)

(define-read-only (get-required-signatures)
    (ok (var-get required-signatures))
)

(define-read-only (get-proposal (proposal-id uint))
    (map-get? proposals proposal-id)
)

(define-read-only (has-signed (proposal-id uint) (signer principal))
    (default-to false (map-get? proposal-signatures { proposal-id: proposal-id, signer: signer }))
)

;; Admin Functions

(define-public (add-signer (new-signer principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
        (asserts! (not (is-signer new-signer)) ERR_ALREADY_SIGNER)
        (map-set signers new-signer true)
        (ok true)
    )
)

(define-public (remove-signer (signer principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
        (asserts! (is-signer signer) ERR_NOT_SIGNER)
        (map-delete signers signer)
        (ok true)
    )
)

(define-public (set-required-signatures (count uint))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
        (var-set required-signatures count)
        (ok true)
    )
)

;; Proposal Functions (using test-expected naming: propose-tx, sign-tx, execute-tx)

(define-public (propose-tx (description (string-utf8 256)) (action (string-ascii 32)) (value uint))
    (let
        (
            (proposal-id (var-get proposal-nonce))
        )
        (asserts! (is-signer tx-sender) ERR_NOT_SIGNER)
        (map-set proposals proposal-id {
            description: description,
            action: action,
            value: value,
            executed: false,
            signature-count: u1
        })
        ;; Proposer automatically signs
        (map-set proposal-signatures { proposal-id: proposal-id, signer: tx-sender } true)
        (var-set proposal-nonce (+ proposal-id u1))
        (ok proposal-id)
    )
)

(define-public (sign-tx (proposal-id uint))
    (let
        (
            (proposal (unwrap! (get-proposal proposal-id) ERR_PROPOSAL_NOT_FOUND))
        )
        (asserts! (is-signer tx-sender) ERR_NOT_SIGNER)
        (asserts! (not (get executed proposal)) ERR_PROPOSAL_EXECUTED)
        (asserts! (not (has-signed proposal-id tx-sender)) ERR_ALREADY_SIGNED)
        (map-set proposal-signatures { proposal-id: proposal-id, signer: tx-sender } true)
        (map-set proposals proposal-id (merge proposal { signature-count: (+ (get signature-count proposal) u1) }))
        (ok true)
    )
)

(define-public (execute-tx (proposal-id uint))
    (let
        (
            (proposal (unwrap! (get-proposal proposal-id) ERR_PROPOSAL_NOT_FOUND))
        )
        (asserts! (is-signer tx-sender) ERR_NOT_SIGNER)
        (asserts! (not (get executed proposal)) ERR_PROPOSAL_EXECUTED)
        (asserts! (>= (get signature-count proposal) (var-get required-signatures)) ERR_INSUFFICIENT_SIGNATURES)
        (map-set proposals proposal-id (merge proposal { executed: true }))
        ;; Execute the action on tipstream contract
        (if (is-eq (get action proposal) "set-paused")
            (contract-call? .tipstream set-paused (> (get value proposal) u0))
            (if (is-eq (get action proposal) "set-fee")
                (contract-call? .tipstream set-fee-basis-points (get value proposal))
                (ok true)
            )
        )
    )
)
