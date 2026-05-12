;; TipStream V3 - Advanced Micro-tipping Platform on Stacks
;; Version: 3.0.0
;; Features: Streaming Payments, Escrow Tips, Composability Traits

(use-trait sip-010-trait .tipstream-traits.sip-010-trait)

;; Version Tracking
(define-constant contract-version u3)
(define-constant contract-name "tipstream-core-v3")

;; ============================================================================
;; ERROR CODES
;; ============================================================================

;; Core errors (100-114)
(define-constant err-owner-only (err u100))
(define-constant err-invalid-amount (err u101))
(define-constant err-insufficient-balance (err u102))
(define-constant err-transfer-failed (err u103))
(define-constant err-not-found (err u104))
(define-constant err-invalid-profile (err u105))
(define-constant err-user-blocked (err u106))
(define-constant err-contract-paused (err u107))
(define-constant err-not-pending-owner (err u108))
(define-constant err-timelock-not-expired (err u109))
(define-constant err-no-pending-change (err u110))
(define-constant err-not-authorized (err u111))
(define-constant err-token-transfer-failed (err u112))
(define-constant err-token-not-whitelisted (err u113))
(define-constant err-invalid-category (err u114))

;; Streaming errors (115-120)
(define-constant err-stream-not-found (err u115))
(define-constant err-stream-not-active (err u116))
(define-constant err-insufficient-stream-balance (err u117))
(define-constant err-stream-already-claimed (err u118))
(define-constant err-not-stream-sender (err u119))
(define-constant err-not-stream-recipient (err u120))

;; Escrow errors (121-130)
(define-constant err-escrow-not-found (err u121))
(define-constant err-escrow-condition-not-met (err u122))
(define-constant err-escrow-expired (err u123))
(define-constant err-escrow-not-expired (err u124))
(define-constant err-escrow-already-released (err u125))
(define-constant err-escrow-already-refunded (err u126))
(define-constant err-invalid-condition-type (err u127))
(define-constant err-insufficient-approvals (err u128))
(define-constant err-not-escrow-sender (err u129))
(define-constant err-not-escrow-recipient (err u130))

;; Composability errors (131-135)
(define-constant err-contract-not-registered (err u131))
(define-constant err-invalid-trait-implementation (err u132))
(define-constant err-contract-call-failed (err u133))
(define-constant err-contract-already-registered (err u134))
(define-constant err-contract-not-active (err u135))

;; ============================================================================
;; CONSTANTS
;; ============================================================================

;; Tip Categories
(define-constant category-general u0)
(define-constant category-content-creation u1)
(define-constant category-open-source u2)
(define-constant category-community-help u3)
(define-constant category-appreciation u4)
(define-constant category-education u5)
(define-constant category-bug-bounty u6)
(define-constant max-category u6)

;; Fee and limits
(define-constant basis-points-divisor u10000)
(define-constant min-tip-amount u1000)
(define-constant min-fee u1)
(define-constant timelock-delay u144)
(define-constant emergency-pause-cooldown u2016)

;; Streaming constants
(define-constant max-stream-duration u52560) ;; ~365 days
(define-constant min-rate-per-block u1)

;; Escrow constants
(define-constant max-escrow-duration u52560) ;; ~365 days
(define-constant condition-time-locked "time-locked")
(define-constant condition-milestone "milestone")
(define-constant condition-multisig "multisig")

;; ============================================================================
;; DATA VARIABLES
;; ============================================================================

;; Core variables
(define-data-var contract-owner principal tx-sender)
(define-data-var pending-owner (optional principal) none)
(define-data-var total-tips-sent uint u0)
(define-data-var total-volume uint u0)
(define-data-var platform-fees uint u0)
(define-data-var is-paused bool false)
(define-data-var current-fee-basis-points uint u50)
(define-data-var pending-fee (optional uint) none)
(define-data-var pending-fee-height uint u0)
(define-data-var pending-pause (optional bool) none)
(define-data-var pending-pause-height uint u0)
(define-data-var authorized-multisig (optional principal) none)
(define-data-var emergency-authority (optional principal) none)
(define-data-var last-emergency-pause uint u0)

;; V3 variables
(define-data-var total-streams uint u0)
(define-data-var total-stream-volume uint u0)
(define-data-var total-escrows uint u0)
(define-data-var total-escrow-volume uint u0)
(define-data-var total-token-tips uint u0)


;; ============================================================================
;; DATA MAPS - CORE TIPPING
;; ============================================================================

(define-map tips
    { tip-id: uint }
    {
        sender: principal,
        recipient: principal,
        amount: uint,
        message: (string-utf8 280),
        tip-height: uint
    }
)

(define-map user-tip-count principal uint)
(define-map user-received-count principal uint)
(define-map user-total-sent principal uint)
(define-map user-total-received principal uint)

(define-map user-profiles
    principal
    {
        display-name: (string-utf8 50),
        bio: (string-utf8 280),
        avatar-url: (string-utf8 256)
    }
)

(define-map blocked-users { blocker: principal, blocked: principal } bool)
(define-map tip-category { tip-id: uint } uint)
(define-map category-tip-count uint uint)

;; Token tipping
(define-map whitelisted-tokens principal bool)
(define-map token-tips
    { token-tip-id: uint }
    {
        sender: principal,
        recipient: principal,
        token-contract: principal,
        amount: uint,
        message: (string-utf8 280),
        tip-height: uint
    }
)

;; ============================================================================
;; DATA MAPS - STREAMING PAYMENTS
;; ============================================================================

(define-map streams
    { stream-id: uint }
    {
        sender: principal,
        recipient: principal,
        rate-per-block: uint,
        start-block: uint,
        end-block: uint,
        last-claim-block: uint,
        total-streamed: uint,
        is-active: bool
    }
)

;; ============================================================================
;; DATA MAPS - ESCROW SYSTEM
;; ============================================================================

(define-map escrow-tips
    { escrow-id: uint }
    {
        sender: principal,
        recipient: principal,
        amount: uint,
        condition-type: (string-ascii 32),
        condition-data: (string-utf8 500),
        expiry-block: uint,
        is-released: bool,
        is-refunded: bool,
        created-block: uint
    }
)

(define-map escrow-approvals
    { escrow-id: uint, approver: principal }
    bool
)

(define-map milestone-completions
    { escrow-id: uint }
    {
        marked-complete: bool,
        completion-block: uint,
        completion-proof: (string-utf8 500)
    }
)

;; ============================================================================
;; DATA MAPS - COMPOSABILITY
;; ============================================================================

(define-map registered-contracts
    principal
    {
        registration-block: uint,
        total-tips-received: uint,
        tip-count: uint,
        is-active: bool
    }
)

(define-map contract-tips
    { contract: principal, tip-id: uint }
    {
        sender: principal,
        amount: uint,
        message: (string-utf8 280),
        tip-block: uint
    }
)

(define-data-var total-contract-tips uint u0)


;; ============================================================================
;; PRIVATE HELPER FUNCTIONS
;; ============================================================================

(define-private (calculate-fee (amount uint))
    (let
        (
            (raw-fee (/ (* amount (var-get current-fee-basis-points)) basis-points-divisor))
        )
        (if (> (var-get current-fee-basis-points) u0)
            (if (< raw-fee min-fee) min-fee raw-fee)
            u0
        )
    )
)

(define-private (is-admin)
    (or
        (is-eq tx-sender (var-get contract-owner))
        (match (var-get authorized-multisig)
            multisig (is-eq contract-caller multisig)
            false
        )
    )
)

(define-private (is-emergency-authorized)
    (match (var-get emergency-authority)
        authority (is-eq tx-sender authority)
        false
    )
)

(define-private (send-tip-tuple (tip-data { recipient: principal, amount: uint, message: (string-utf8 280) }))
    (send-tip (get recipient tip-data) (get amount tip-data) (get message tip-data))
)

;; Calculate claimable amount for a stream
(define-private (calculate-claimable (stream-data {
    sender: principal,
    recipient: principal,
    rate-per-block: uint,
    start-block: uint,
    end-block: uint,
    last-claim-block: uint,
    total-streamed: uint,
    is-active: bool
}))
    (let
        (
            (current-block block-height)
            (blocks-since-claim (- current-block (get last-claim-block stream-data)))
            (blocks-until-end (if (> (get end-block stream-data) current-block)
                (- (get end-block stream-data) current-block)
                u0))
            (claimable-blocks (if (> blocks-until-end u0)
                blocks-since-claim
                (if (> (get end-block stream-data) (get last-claim-block stream-data))
                    (- (get end-block stream-data) (get last-claim-block stream-data))
                    u0)))
        )
        (* claimable-blocks (get rate-per-block stream-data))
    )
)

;; Verify escrow condition is met
(define-private (verify-escrow-condition (escrow-id uint) (escrow-data {
    sender: principal,
    recipient: principal,
    amount: uint,
    condition-type: (string-ascii 32),
    condition-data: (string-utf8 500),
    expiry-block: uint,
    is-released: bool,
    is-refunded: bool,
    created-block: uint
}))
    (if (is-eq (get condition-type escrow-data) condition-time-locked)
        ;; Time-locked: check if current block >= expiry
        (ok (>= block-height (get expiry-block escrow-data)))
        (if (is-eq (get condition-type escrow-data) condition-milestone)
            ;; Milestone: check if marked complete and approved
            (match (map-get? milestone-completions { escrow-id: escrow-id })
                completion (ok (get marked-complete completion))
                (ok false))
            ;; Other condition types not yet implemented
            (ok false)
        )
    )
)


;; ============================================================================
;; PUBLIC FUNCTIONS - CORE TIPPING (from V2)
;; ============================================================================

(define-public (send-tip (recipient principal) (amount uint) (message (string-utf8 280)))
    (let
        (
            (tip-id (var-get total-tips-sent))
            (fee (calculate-fee amount))
            (net-amount (- amount fee))
            (sender-sent (default-to u0 (map-get? user-total-sent tx-sender)))
            (recipient-received (default-to u0 (map-get? user-total-received recipient)))
            (sender-count (default-to u0 (map-get? user-tip-count tx-sender)))
            (recipient-count (default-to u0 (map-get? user-received-count recipient)))
        )
        (asserts! (not (var-get is-paused)) err-contract-paused)
        (asserts! (>= amount min-tip-amount) err-invalid-amount)
        (asserts! (not (is-eq tx-sender recipient)) err-invalid-amount)
        (asserts! (not (default-to false (map-get? blocked-users { blocker: recipient, blocked: tx-sender }))) err-user-blocked)
        
        (try! (stx-transfer? net-amount tx-sender recipient))
        (if (> fee u0)
            (try! (stx-transfer? fee tx-sender (var-get contract-owner)))
            true
        )
        
        (map-set tips
            { tip-id: tip-id }
            {
                sender: tx-sender,
                recipient: recipient,
                amount: amount,
                message: message,
                tip-height: block-height
            }
        )
        
        (map-set user-total-sent tx-sender (+ sender-sent amount))
        (map-set user-total-received recipient (+ recipient-received amount))
        (map-set user-tip-count tx-sender (+ sender-count u1))
        (map-set user-received-count recipient (+ recipient-count u1))
        
        (var-set total-tips-sent (+ tip-id u1))
        (var-set total-volume (+ (var-get total-volume) amount))
        (var-set platform-fees (+ (var-get platform-fees) fee))

        (print {
            event: "tip-sent",
            tip-id: tip-id,
            sender: tx-sender,
            recipient: recipient,
            amount: amount,
            fee: fee,
            net-amount: net-amount
        })

        (ok tip-id)
    )
)

(define-public (update-profile (display-name (string-utf8 50)) (bio (string-utf8 280)) (avatar-url (string-utf8 256)))
    (begin
        (asserts! (> (len display-name) u0) err-invalid-profile)
        (map-set user-profiles
            tx-sender
            {
                display-name: display-name,
                bio: bio,
                avatar-url: avatar-url
            }
        )
        (print {
            event: "profile-updated",
            user: tx-sender,
            display-name: display-name
        })
        (ok true)
    )
)

(define-public (send-categorized-tip (recipient principal) (amount uint) (message (string-utf8 280)) (category uint))
    (begin
        (asserts! (<= category max-category) err-invalid-category)
        (let
            (
                (tip-id-response (try! (send-tip recipient amount message)))
                (current-count (default-to u0 (map-get? category-tip-count category)))
            )
            (map-set tip-category { tip-id: tip-id-response } category)
            (map-set category-tip-count category (+ current-count u1))
            (print {
                event: "tip-categorized",
                tip-id: tip-id-response,
                category: category
            })
            (ok tip-id-response)
        )
    )
)

(define-public (tip-a-tip (target-tip-id uint) (amount uint) (message (string-utf8 280)))
    (let
        (
            (target-tip (unwrap! (map-get? tips { tip-id: target-tip-id }) err-not-found))
            (original-sender (get sender target-tip))
        )
        (send-tip original-sender amount message)
    )
)

(define-public (toggle-block-user (user principal))
    (let
        (
            (is-blocked (default-to false (map-get? blocked-users { blocker: tx-sender, blocked: user })))
            (new-state (not is-blocked))
        )
        (map-set blocked-users { blocker: tx-sender, blocked: user } new-state)
        (print {
            event: "user-blocked",
            blocker: tx-sender,
            blocked: user,
            is-blocked: new-state
        })
        (ok new-state)
    )
)

(define-public (send-batch-tips (tips-list (list 50 { recipient: principal, amount: uint, message: (string-utf8 280) })))
    (ok (map send-tip-tuple tips-list))
)

(define-private (strict-tip-fold
    (tip-data { recipient: principal, amount: uint, message: (string-utf8 280) })
    (acc (response uint uint))
)
    (match acc
        ok-val (match (send-tip (get recipient tip-data) (get amount tip-data) (get message tip-data))
            success (ok (+ ok-val u1))
            error (err error)
        )
        err-val (err err-val)
    )
)

(define-public (send-batch-tips-strict (tips-list (list 50 { recipient: principal, amount: uint, message: (string-utf8 280) })))
    (fold strict-tip-fold tips-list (ok u0))
)


;; ============================================================================
;; PUBLIC FUNCTIONS - STREAMING PAYMENTS (NEW IN V3)
;; ============================================================================

(define-public (create-stream (recipient principal) (rate-per-block uint) (duration-blocks uint))
    (let
        (
            (stream-id (var-get total-streams))
            (end-block (+ block-height duration-blocks))
            (total-amount (* rate-per-block duration-blocks))
            (fee (calculate-fee total-amount))
            (total-with-fee (+ total-amount fee))
        )
        ;; Validations
        (asserts! (not (var-get is-paused)) err-contract-paused)
        (asserts! (not (is-eq tx-sender recipient)) err-invalid-amount)
        (asserts! (>= rate-per-block min-rate-per-block) err-invalid-amount)
        (asserts! (> duration-blocks u0) err-invalid-amount)
        (asserts! (<= duration-blocks max-stream-duration) err-invalid-amount)
        
        ;; Lock total amount + fee from sender
        (try! (stx-transfer? total-with-fee tx-sender (as-contract tx-sender)))
        
        ;; Store stream data
        (map-set streams
            { stream-id: stream-id }
            {
                sender: tx-sender,
                recipient: recipient,
                rate-per-block: rate-per-block,
                start-block: block-height,
                end-block: end-block,
                last-claim-block: block-height,
                total-streamed: u0,
                is-active: true
            }
        )
        
        (var-set total-streams (+ stream-id u1))
        (var-set total-stream-volume (+ (var-get total-stream-volume) total-amount))
        
        (print {
            event: "stream-created",
            stream-id: stream-id,
            sender: tx-sender,
            recipient: recipient,
            rate-per-block: rate-per-block,
            start-block: block-height,
            end-block: end-block,
            total-amount: total-amount
        })
        
        (ok stream-id)
    )
)

(define-public (claim-stream (stream-id uint))
    (let
        (
            (stream-data (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
            (claimable-amount (calculate-claimable stream-data))
        )
        ;; Validations
        (asserts! (is-eq tx-sender (get recipient stream-data)) err-not-stream-recipient)
        (asserts! (get is-active stream-data) err-stream-not-active)
        (asserts! (> claimable-amount u0) err-insufficient-stream-balance)
        
        ;; Transfer claimable amount to recipient
        (try! (as-contract (stx-transfer? claimable-amount tx-sender (get recipient stream-data))))
        
        ;; Update stream data
        (map-set streams
            { stream-id: stream-id }
            (merge stream-data {
                last-claim-block: block-height,
                total-streamed: (+ (get total-streamed stream-data) claimable-amount)
            })
        )
        
        (print {
            event: "stream-claimed",
            stream-id: stream-id,
            recipient: tx-sender,
            amount-claimed: claimable-amount,
            claim-block: block-height
        })
        
        (ok claimable-amount)
    )
)

(define-public (cancel-stream (stream-id uint))
    (let
        (
            (stream-data (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
            (claimable-amount (calculate-claimable stream-data))
            (blocks-remaining (if (> (get end-block stream-data) block-height)
                (- (get end-block stream-data) block-height)
                u0))
            (refund-amount (* blocks-remaining (get rate-per-block stream-data)))
        )
        ;; Validations
        (asserts! (is-eq tx-sender (get sender stream-data)) err-not-stream-sender)
        (asserts! (get is-active stream-data) err-stream-not-active)
        
        ;; If there's claimable amount, send to recipient first
        (if (> claimable-amount u0)
            (try! (as-contract (stx-transfer? claimable-amount tx-sender (get recipient stream-data))))
            true
        )
        
        ;; Refund remaining to sender
        (if (> refund-amount u0)
            (try! (as-contract (stx-transfer? refund-amount tx-sender (get sender stream-data))))
            true
        )
        
        ;; Mark stream as inactive
        (map-set streams
            { stream-id: stream-id }
            (merge stream-data {
                is-active: false,
                last-claim-block: block-height,
                total-streamed: (+ (get total-streamed stream-data) claimable-amount)
            })
        )
        
        (print {
            event: "stream-cancelled",
            stream-id: stream-id,
            sender: tx-sender,
            refund-amount: refund-amount,
            final-claim: claimable-amount,
            cancel-block: block-height
        })
        
        (ok refund-amount)
    )
)


;; ============================================================================
;; PUBLIC FUNCTIONS - ESCROW SYSTEM (NEW IN V3)
;; ============================================================================

(define-public (create-escrow-tip 
    (recipient principal) 
    (amount uint) 
    (condition-type (string-ascii 32))
    (condition-data (string-utf8 500))
    (expiry-blocks uint))
    (let
        (
            (escrow-id (var-get total-escrows))
            (expiry-block (+ block-height expiry-blocks))
            (fee (calculate-fee amount))
            (total-with-fee (+ amount fee))
        )
        ;; Validations
        (asserts! (not (var-get is-paused)) err-contract-paused)
        (asserts! (not (is-eq tx-sender recipient)) err-invalid-amount)
        (asserts! (>= amount min-tip-amount) err-invalid-amount)
        (asserts! (> expiry-blocks u0) err-invalid-amount)
        (asserts! (<= expiry-blocks max-escrow-duration) err-invalid-amount)
        (asserts! (or 
            (is-eq condition-type condition-time-locked)
            (is-eq condition-type condition-milestone)
            (is-eq condition-type condition-multisig))
            err-invalid-condition-type)
        
        ;; Lock amount + fee in escrow
        (try! (stx-transfer? total-with-fee tx-sender (as-contract tx-sender)))
        
        ;; Store escrow data
        (map-set escrow-tips
            { escrow-id: escrow-id }
            {
                sender: tx-sender,
                recipient: recipient,
                amount: amount,
                condition-type: condition-type,
                condition-data: condition-data,
                expiry-block: expiry-block,
                is-released: false,
                is-refunded: false,
                created-block: block-height
            }
        )
        
        (var-set total-escrows (+ escrow-id u1))
        (var-set total-escrow-volume (+ (var-get total-escrow-volume) amount))
        
        (print {
            event: "escrow-created",
            escrow-id: escrow-id,
            sender: tx-sender,
            recipient: recipient,
            amount: amount,
            condition-type: condition-type,
            expiry-block: expiry-block
        })
        
        (ok escrow-id)
    )
)

(define-public (release-escrow (escrow-id uint))
    (let
        (
            (escrow-data (unwrap! (map-get? escrow-tips { escrow-id: escrow-id }) err-escrow-not-found))
            (condition-met (try! (verify-escrow-condition escrow-id escrow-data)))
            (fee (calculate-fee (get amount escrow-data)))
        )
        ;; Validations
        (asserts! (not (get is-released escrow-data)) err-escrow-already-released)
        (asserts! (not (get is-refunded escrow-data)) err-escrow-already-refunded)
        (asserts! condition-met err-es        di       t-met)
        (asserts! (< block-height (get expiry-block escrow-data)) err-escrow-expired)
        
        ;; Transfer amount to recipient
        (try! (as-contract (stx-transfer? (get amount escrow-data) tx-sender (get recipient escrow-data))))
        
        ;; Transfer fee to owner
        (if (> fee u0)
            (try! (as-contract (stx-transfer? fee tx-sender (var-get contract-owner))))
            true
        )
        
        ;; Mark as released
        (map-set escrow-tips
            { escrow-id: escrow-id }
            (merge escrow-data { is-released: true })
        )
        
        (var-set platform-fees (+ (var-get platform-fees) fee))
        
        (print {
            event: "escrow-released",
            escrow-id: escrow-id,
            recipient: (get recipient escrow-data),
            amount: (get amount escrow-data),
            release-block: block-height
        })
        
        (ok (get amount escrow-data))
    )
)

(define-public (refund-escrow (escrow-id uint))
    (let
        (
            (escrow-data (unwrap! (map-get? escrow-tips { escrow-id: escrow-id }) err-escrow-not-found))
            (fee (calculate-fee (get amount escrow-data)))
            (refund-amount (+ (get amount escrow-data) fee))
        )
        ;; Validations
        (asserts! (is-eq tx-sender (get sender escrow-data)) err-not-escrow-sender)
        (asserts! (not (get is-released escrow-data)) err-escrow-already-released)
        (asserts! (not (get is-refunded escrow-data)) err-escrow-already-refunded)
        (asserts! (>= block-height (get expiry-block escrow-data)) err-escrow-not-expired)
        
        ;; Refund to sender
        (try! (as-contract (stx-transfer? refund-amount tx-sender (get sender escrow-data))))
        
        ;; Mark as refunded
        (map-set escrow-tips
            { escrow-id: escrow-id }
            (merge escrow-data { is-refunded: true })
        )
        
        (print {
            event: "escrow-refunded",
            escrow-id: escrow-id,
            sender: (get sender escrow-data),
            amount: refund-amount,
            refund-block: block-height
        })
        
        (ok refund-amount)
    )
)

(define-public (mark-milestone-complete (escrow-id uint) (proof (string-utf8 500)))
    (let
        (
            (escrow-data (unwrap! (map-get? escrow-tips { escrow-id: escrow-id }) err-escrow-not-found))
        )
        ;; Validations
        (asserts! (is-eq tx-sender (get recipient escrow-data)) err-not-escrow-recipient)
        (asserts! (is-eq (get condition-type escrow-data) condition-milestone) err-invalid-condition-type)
        (asserts! (not (get is-released escrow-data)) err-escrow-already-released)
        (asserts! (not (get is-refunded escrow-data)) err-escrow-already-refunded)
        
        ;; Mark milestone as complete
        (map-set milestone-completions
            { escrow-id: escrow-id }
            {
                marked-complete: true,
                completion-block: block-height,
                completion-proof: proof
            }
        )
        
        (print {
            event: "milestone-marked-complete",
            escrow-id: escrow-id,
            recipient: tx-sender,
            completion-block: block-height
        })
        
        (ok true)
    )
)

(define-public (approve-escrow (escrow-id uint))
    (let
        (
            (escrow-data (unwrap! (map-get? escrow-tips { escrow-id: escrow-id }) err-escrow-not-found))
        )
        ;; Validations
        (asserts! (is-eq tx-sender (get sender escrow-data)) err-not-escrow-sender)
        (asserts! (not (get is-released escrow-data)) err-escrow-already-released)
        
        ;; Record approval
        (map-set escrow-approvals
            { escrow-id: escrow-id, approver: tx-sender }
            true
        )
        
        (print {
            event: "escrow-approved",
            escrow-id: escrow-id,
            approver: tx-sender,
            approval-block: block-height
        })
        
        (ok true)
    )
)


;; ============================================================================
;; PUBLIC FUNCTIONS - COMPOSABILITY (NEW IN V3)
;; ============================================================================

(define-public (register-tippable-contract (contract-principal principal))
    (begin
        ;; Validations
        (asserts! (is-admin) err-owner-only)
        (asserts! (is-none (map-get? registered-contracts contract-principal)) err-contract-already-registered)
        
        ;; Register contract
        (map-set registered-contracts
            contract-principal
            {
                registration-block: block-height,
                total-tips-received: u0,
                tip-count: u0,
                is-active: true
            }
        )
        
        (print {
            event: "contract-registered",
            contract: contract-principal,
            registration-block: block-height
        })
        
        (ok true)
    )
)

(define-public (deregister-contract (contract-principal principal))
    (let
        (
            (contract-data (unwrap! (map-get? registered-contracts contract-principal) err-contract-not-registered))
        )
        ;; Validations
        (asserts! (is-admin) err-owner-only)
        
        ;; Deactivate contract
        (map-set registered-contracts
            contract-principal
            (merge contract-data { is-active: false })
        )
        
        (print {
            event: "contract-deregistered",
            contract: contract-principal,
            deregistration-block: block-height
        })
        
        (ok true)
    )
)

(define-public (tip-to-contract (contract-principal principal) (amount uint) (message (string-utf8 280)))
    (let
        (
            (contract-data (unwrap! (map-get? registered-contracts contract-principal) err-contract-not-registered))
            (tip-id (var-get total-contract-tips))
            (fee (calculate-fee amount))
            (net-amount (- amount fee))
        )
        ;; Validations
        (asserts! (not (var-get is-paused)) err-contract-paused)
        (asserts! (get is-active contract-data) err-contract-not-active)
        (asserts! (>= amount min-tip-amount) err-invalid-amount)
        
        ;; Transfer to contract
        (try! (stx-transfer? net-amount tx-sender contract-principal))
        
        ;; Transfer fee to owner
        (if (> fee u0)
            (try! (stx-transfer? fee tx-sender (var-get contract-owner)))
            true
        )
        
        ;; Store tip data
        (map-set contract-tips
            { contract: contract-principal, tip-id: tip-id }
            {
                sender: tx-sender,
                amount: amount,
                message: message,
                tip-block: block-height
            }
        )
        
        ;; Update contract stats
        (map-set registered-contracts
            contract-principal
            (merge contract-data {
                total-tips-received: (+ (get total-tips-received contract-data) amount),
                tip-count: (+ (get tip-count contract-data) u1)
            })
        )
        
        (var-set total-contract-tips (+ tip-id u1))
        (var-set platform-fees (+ (var-get platform-fees) fee))
        
        (print {
            event: "contract-tip-sent",
            contract: contract-principal,
            tip-id: tip-id,
            sender: tx-sender,
            amount: amount,
            fee: fee
        })
        
        (ok tip-id)
    )
)


;; ============================================================================
;; PUBLIC FUNCTIONS - TOKEN TIPPING (from V2)
;; ============================================================================

(define-public (send-token-tip
    (token <sip-010-trait>)
    (recipient principal)
    (amount uint)
    (message (string-utf8 280))
)
    (let
        (
            (token-principal (contract-of token))
            (tip-id (var-get total-token-tips))
        )
        (asserts! (not (var-get is-paused)) err-contract-paused)
        (asserts! (> amount u0) err-invalid-amount)
        (asserts! (not (is-eq tx-sender recipient)) err-invalid-amount)
        (asserts! (default-to false (map-get? whitelisted-tokens token-principal)) err-token-not-whitelisted)
        (asserts! (not (default-to false (map-get? blocked-users { blocker: recipient, blocked: tx-sender }))) err-user-blocked)

        (unwrap! (contract-call? token transfer amount tx-sender recipient no        (unwrap! (contract-call? token trans-set token-tips
            { token-tip-id: tip-id }
            {
                sender: tx-sender,
                recipient: recipient,
                token-contract: token-principal,
                amoun                amoun        ss                amoun         tip-height: block-height
            }
        )

        (var-set total-token-tips (+ tip-id u1))

        (print {
            event: "token-tip-sent",
            token-tip-id: tip-id,
            sen            sen            sen            sen            sen   oken-contract: token-principal,
            amount: amount,
            message: message
        })

        (ok tip-id)
    )
)

(define-public (whitelist-token (token-contract principal) (allowed bool))
    (begin
        (asserts! (i        (asserts! (i        (asserts! (i        (asserts! (i        (asserts! (i        (ass (print { event: "token-whitelist-updated", token-contract: token-contract, allowed: allowed })
        (ok true)
    )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - A;; PUBLIC FUNCTIONS - A;; PUBLIC ==;; PUB================================;; PUBLIC FUNCTIONS - A;; PUBLIC FUNCTIONS - Argency-authority (authority (optional principal)))
    (begin
        (asserts! (is-admin) err-owner-only)
               t         y-authority authority)
        (ok true)
    )
)

(define-public (emer(define-public (emer(define-public serts! (is-emergency-authorized) err-not-authorized)
        (asserts! (or (is-eq (var-get last-emergency-pause) u0) (>= block-height (+ (var-get last-emergency-pause) emergency-pause-cooldown))) err-tim        (-expired)
        (var-set is-pa        (var-set is-pa        (var-set isy-pause block-height)
        (ok true)
    )
)

(define-public (propose-fee-change (new-fee uint))
    (begin
        (asserts! (is-admin) err-owner-only)
        (asserts! (<= new-fee u1000) err-invalid-amount)
        (var-set pending-fee (some new-f        (var-setr-    pendi        (var-set pending-fee (some new-f        (var-setr-    pendi        (vaen        (var-set pending-fee (some new-f        (var-setr-    pendi        (var-set pending-fee (some new-f        (var-setr-    pendi        (vaen        (var-set pending-fxecute-fee-change)
                 (
            (new-fee (unwrap! (var-get pending-fee) err-no-pending-change))
        )
        (asserts! (is-admin) err-owner-only)
        (asserts! (>= block-height (var-get pending-fee-height)) err-timelock-not-expired)
        (var-set current-fee-basis-points new-fee)
        (var-set pending-fee none)
        (print { event: "fee-change-executed", new-fee: new-fee })
        (ok true)
    )
)

(define-public (cancel-fee-change)
    (begin
        (asserts! (is-admin) err-owner-only)
        (asserts! (is-some (var-get pending-fee)) err-no-pending-change)
        (var-set pending-fee none)
                                                               rue)
    )
)

(define-public (propose-pause-change (paused bool))
    (begin
        (asserts! (is-admin) err-owner-only)
        (var-set pending-pause (some paused))
        (var-set pending-pause-height (+ block-height timelock-delay))
        (print {
            event: "pause-change-proposed",
            paused: paused,
            effective-height: (+ block-height timelock-delay)
        })
        (ok true)
    )
)

(define-(define-execute-pause-change)
    (let
        (
            (paused (unwrap! (var-get pending-pause) err-no-pending-change))
        )
        (asserts! (is-admin) err-owner-only)
        (asserts! (>= block-height (var-get pending-pause-height)) err-timelock-not-expired)
        (var-set is-paused paused)
        (var-set pending-pause none)
        (print { event: "pause-change-executed", paused: paused })
        (ok true)
    )
)

(define-public (cancel-pause-change)
    (begin
        (asserts! (is-admin) err-owner-only)
        (asserts! (is-some (var-get pending-pause)) err-no-pending-change)
        (var-set pending-pause none)
        (var-set pending-pause-height u0)
        (print { event: "pause-change-cancelled" })
        (ok true)
    )
)

(define-public (set-multisig (multisig (optional principal)))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
        (var-set authorized-multisig multisig)
        (ok true)
    )
)

(define-public (propose-new-owner (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) err-owner-only)
        (var-set pending-owner (some new-owner))
        (print { event: "ownership-proposed", current-owner: tx-sender, proposed-owner: new-owner })
        (ok true)
    )
)

(define-public (accept-ownership)
    (let
        (
            (new-owner (unwrap! (var-get pending-owner) err-not-pending-owner))
        )
        (asserts! (is-eq tx-sender new-owner) err-not-pending-owner)
        (var-set contract-owner new-owner)
        (var-set pending-owner none)
        (print { event: "ownership-transferred", new-owner: new-owner })
        (ok true)
    )
)


;; ============================================================================
;; READ-ONLY FUNCTIONS - CORE
;; ============================================================================

(define-read-only (get-tip (tip-id uint))
    (map-get? tips { tip-id: tip-id })
)

(define-read-only (get-profile (user principal))
    (map-get? user-profiles user)
)

(define-read-only (is-user-blocked (blocker principal) (user principal))
    (default-to false (map-get? blocked-users { blocker: blocker, blocked: user }))
)

(define-read-only (get-user-stats (user principal))
    {
        tips-sent: (default-to u0 (map-get? user-tip-count user)),
        tips-received: (default-to u0 (map-get? user-received-count user)),
        total-sent: (default-to u0 (map-get? user-total-sent user)),
        total-received: (default-to u0 (map-get? user-total-received user))
    }
)

(define-read-only (get-platform-stats)
    {
        total-tips: (var-get total-tips-sent),
        total-volume: (var-get total-volume),
        platform-fees: (var-get platform-fees),
        total-streams: (var-get total-streams),
        total-stream-volume: (var-get total-stream-volume),
        total-escrows: (var-get total-escrows),
        total-escrow-volume: (var-get total-escrow-volume)
    }
)

(define-read-only (get-contract-owner)
    (ok (var-get contract-owner))
)

(define-read-only (get-is-paused)
    (ok (var-get is-paused))
)

(define-read-only (get-current-fee-basis-points)
    (ok (var-get current-fee-basis-points))
)

(define-read-only (get-contract-version)
    (ok { version: contract-version, name: contract-name })
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - STREAMING
;; ============================================================================

(define-read-only (get-stream (stream-id uint))
    (map-get? streams { stream-id: stream-id })
)

(define-read-only (get-claimable-amount (stream-id uint))
    (match (map-get? streams { stream-id: stream-id })
        stream-data (ok (calculate-claimable stream-data))
        err-stream-not-found
    )
)

(define-read-only (get-total-streams)
    (ok (var-get total-streams))
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - ESCROW
;; ============================================================================

(define-read-only (get-escrow (escrow-id uint))
    (map-get? escrow-tips { escrow-id: escrow-id })
)

(define-read-only (get-milestone-completion (escrow-id uint))
    (map-get? milestone-completions { escrow-id: escrow-id })
)

(define-read-only (is-escrow-approved (escrow-id uint) (approver principal))
    (default-to false (map-get? escrow-approvals { escrow-id: escrow-id, approver: approver }))
)

(define-read-only (get-total-escrows)
    (ok (var-get total-escrows))
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - COMPOSABILITY
;; ============================================================================

(define-read-only (get-registered-contract (contract-principal principal))
    (map-get? registered-contracts contract-principal)
)

(define-read-only (is-contract-registered (contract-principal principal))
    (is-some (map-get? registered-contracts contract-principal))
)

(define-read-only (get-contract-tip (contract principal) (tip-id uint))
    (map-get? contract-tips { contract: contract, tip-id: tip-id })
)

(define-read-only (get-total-contract-tips)
    (ok (var-get total-contract-tips))
)

;; ============================================================================
;; READ-ONLY FUNCTIONS - TOKEN TIPPING
;; ============================================================================

(define-read-only (get-token-tip (token-tip-id uint))
    (map-get? token-tips { token-tip-id: token-tip-id })
)

(define-read-only (is-token-whitelisted (token-contract principal))
    (ok (default-to false (map-get? whitelisted-tokens token-contract)))
)

(define-read-only (get-tip-category (tip-id uint))
    (ok (default-to u0 (map-get? tip-category { tip-id: tip-id })))
)

(define-read-only (get-category-count (category uint))
    (ok (default-to u0 (map-get? category-tip-count category)))
)

(define-read-only (get-multiple-user-stats (users (list 20 principal)))
    (ok (map get-user-stats users))
)

(define-read-only (get-min-tip-amount)
    (ok min-tip-amount)
)

(define-read-only (get-fee-for-amount (amount uint))
    (ok (calculate-fee amount))
)

(define-read-only (get-pending-fee-change)
    {
        pending-fee: (var-get pending-fee),
        effective-height: (var-get pending-fee-height)
    }
)

(define-read-only (get-pending-pause-change)
    {
        pending-pause: (var-get pending-pause),
        effective-height: (var-get pending-pause-height)
    }
)

(define-read-only (get-pending-owner)
    (ok (var-get pending-owner))
)

(define-read-only (get-multisig)
    (ok (var-get authorized-multisig))
)

(define-read-only (get-emergency-authority)
    (ok (var-get emergency-authority))
)

(define-read-only (get-last-emergency-pause)
    (ok (var-get last-emergency-pause))
)

(define-read-only (get-total-token-tips)
    (ok (var-get total-token-tips))
)

(define-read-only (get-user-sent-total (user principal))
    (ok (default-to u0 (map-get? user-total-sent user)))
)

(define-read-only (get-user-received-total (user principal))
    (ok (default-to u0 (map-get? user-total-received user)))
)
