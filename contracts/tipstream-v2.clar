;; TipStream - Micro-tipping platform on Stacks
;; Version: 2.0.0

(use-trait sip-010-trait .tipstream-traits.sip-010-trait)

;; Version Tracking
(define-constant contract-version u2)
(define-constant contract-name "tipstream-core-v2")

;; Constants
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

;; Tip Categories (uint enum)
(define-constant category-general u0)
(define-constant category-content-creation u1)
(define-constant category-open-source u2)
(define-constant category-community-help u3)
(define-constant category-appreciation u4)
(define-constant category-education u5)
(define-constant category-bug-bounty u6)
(define-constant max-category u6)

(define-constant basis-points-divisor u10000)
(define-constant min-tip-amount u1000)
(define-constant min-fee u1)
(define-constant timelock-delay u144)
(define-constant emergency-pause-cooldown u2016)

;; Data Variables
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

;; Data Maps
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

(define-map whitelisted-tokens principal bool)
(define-data-var total-token-tips uint u0)
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

;; Private Functions
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

;; Public Functions
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

;; Profile Functions
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

;; SIP-010 Token Tipping
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

        (unwrap! (contract-call? token transfer amount tx-sender recipient none) err-token-transfer-failed)

        (map-set token-tips
            { token-tip-id: tip-id }
            {
                sender: tx-sender,
                recipient: recipient,
                token-contract: token-principal,
                amount: amount,
                message: message,
                tip-height: block-height
            }
        )

        (var-set total-token-tips (+ tip-id u1))

        (print {
            event: "token-tip-sent",
            token-tip-id: tip-id,
            sender: tx-sender,
            recipient: recipient,
            token-contract: token-principal,
            amount: amount,
            message: message
        })

        (ok tip-id)
    )
)

(define-public (whitelist-token (token-contract principal) (allowed bool))
    (begin
        (asserts! (is-admin) err-owner-only)
        (map-set whitelisted-tokens token-contract allowed)
        (print { event: "token-whitelist-updated", token-contract: token-contract, allowed: allowed })
        (ok true)
    )
)

;; Privacy Functions
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

;; Admin Functions
(define-public (set-emergency-authority (authority (optional principal)))
    (begin
        (asserts! (is-admin) err-owner-only)
        (var-set emergency-authority authority)
        (ok true)
    )
)

(define-public (emergency-pause)
    (begin
        (asserts! (is-emergency-authorized) err-not-authorized)
        (asserts! (or (is-eq (var-get last-emergency-pause) u0) (>= block-height (+ (var-get last-emergency-pause) emergency-pause-cooldown))) err-timelock-not-expired)
        (var-set is-paused true)
        (var-set last-emergency-pause block-height)
        (ok true)
    )
)

;; Time-locked Admin Functions
(define-public (propose-fee-change (new-fee uint))
    (begin
        (asserts! (is-admin) err-owner-only)
        (asserts! (<= new-fee u1000) err-invalid-amount)
        (var-set pending-fee (some new-fee))
        (var-set pending-fee-height (+ block-height timelock-delay))
        (print {
            event: "fee-change-proposed",
            new-fee: new-fee,
            effective-height: (+ block-height timelock-delay)
        })
        (ok true)
    )
)

(define-public (execute-fee-change)
    (let
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
        (print { event: "fee-change-cancelled" })
        (ok true)
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

(define-public (execute-pause-change)
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

;; Read-only Functions
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
        platform-fees: (var-get platform-fees)
    }
)

(define-read-only (get-user-sent-total (user principal))
    (ok (default-to u0 (map-get? user-total-sent user)))
)

(define-read-only (get-user-received-total (user principal))
    (ok (default-to u0 (map-get? user-total-received user)))
)

(define-read-only (get-min-tip-amount)
    (ok min-tip-amount)
)

(define-read-only (get-contract-owner)
    (ok (var-get contract-owner))
)

(define-read-only (get-pending-owner)
    (ok (var-get pending-owner))
)

(define-read-only (get-current-fee-basis-points)
    (ok (var-get current-fee-basis-points))
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

;; Returns the current pause state of the contract.
;; When paused, tip operations are disabled.
;; Returns (ok true) if paused, (ok false) if running.
(define-read-only (get-is-paused)
    (ok (var-get is-paused))
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

(define-read-only (get-multiple-user-stats (users (list 20 principal)))
    (ok (map get-user-stats users))
)

(define-read-only (get-contract-version)
    (ok { version: contract-version, name: contract-name })
)

(define-read-only (get-token-tip (token-tip-id uint))
    (map-get? token-tips { token-tip-id: token-tip-id })
)

(define-read-only (is-token-whitelisted (token-contract principal))
    (ok (default-to false (map-get? whitelisted-tokens token-contract)))
)

(define-read-only (get-total-token-tips)
    (ok (var-get total-token-tips))
)

(define-read-only (get-tip-category (tip-id uint))
    (ok (default-to u0 (map-get? tip-category { tip-id: tip-id })))
)

(define-read-only (get-category-count (category uint))
    (ok (default-to u0 (map-get? category-tip-count category)))
)
