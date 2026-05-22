;; TipStream - Micro-tipping platform on Stacks
;; Version: 3.0.0

(use-trait sip-010-trait .tipstream-traits.sip-010-trait)

;; Error codes
(define-constant err-owner-only (err u100))
(define-constant err-invalid-amount (err u101))
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
(define-constant err-refund-window-expired (err u115))
(define-constant err-already-refunded (err u116))
(define-constant err-not-tip-sender (err u117))
(define-constant err-refund-not-found (err u118))
(define-constant err-refund-not-pending (err u119))

;; Tip categories
(define-constant max-category u6)

;; Fee and limits
(define-constant basis-points-divisor u10000)
(define-constant min-tip-amount u1000)
(define-constant min-fee u1)
(define-constant timelock-delay u144)
(define-constant refund-window-blocks u144)

;; Refund statuses
(define-constant refund-status-pending u0)
(define-constant refund-status-approved u1)
(define-constant refund-status-rejected u2)

;; Data variables
(define-data-var contract-owner principal tx-sender)
(define-data-var pending-owner (optional principal) none)
(define-data-var total-tips-sent uint u0)
(define-data-var total-volume uint u0)
(define-data-var platform-fees uint u0)
(define-data-var is-paused bool false)
(define-data-var current-fee-basis-points uint u50)
(define-data-var pending-fee (optional uint) none)
(define-data-var pending-fee-height uint u0)
(define-data-var authorized-multisig (optional principal) none)
(define-data-var total-token-tips uint u0)

;; Data maps
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

(define-map refund-requests
    { tip-id: uint }
    {
        sender: principal,
        recipient: principal,
        amount: uint,
        request-height: uint,
        status: uint
    }
)

(define-map refunded-tips { tip-id: uint } bool)

;; Private helpers
(define-private (calculate-fee (amount uint))
    (let ((raw-fee (/ (* amount (var-get current-fee-basis-points)) basis-points-divisor)))
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

(define-private (send-tip-tuple (tip-data { recipient: principal, amount: uint, message: (string-utf8 280) }))
    (send-tip (get recipient tip-data) (get amount tip-data) (get message tip-data))
)

;; Core tipping
(define-public (send-tip (recipient principal) (amount uint) (message (string-utf8 280)))
    (let
        (
            (tip-id (var-get total-tips-sent))
            (fee (calculate-fee amount))
            (net-amount (- amount fee))
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

        (map-set tips { tip-id: tip-id }
            { sender: tx-sender, recipient: recipient, amount: amount, message: message, tip-height: block-height }
        )
        (map-set user-total-sent tx-sender (+ (default-to u0 (map-get? user-total-sent tx-sender)) amount))
        (map-set user-total-received recipient (+ (default-to u0 (map-get? user-total-received recipient)) net-amount))
        (map-set user-tip-count tx-sender (+ (default-to u0 (map-get? user-tip-count tx-sender)) u1))
        (map-set user-received-count recipient (+ (default-to u0 (map-get? user-received-count recipient)) u1))

        (var-set total-tips-sent (+ tip-id u1))
        (var-set total-volume (+ (var-get total-volume) amount))
        (var-set platform-fees (+ (var-get platform-fees) fee))

        (print { event: "tip-sent", tip-id: tip-id, sender: tx-sender, recipient: recipient, amount: amount, fee: fee, net-amount: net-amount })
        (ok tip-id)
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
            (print { event: "tip-categorized", tip-id: tip-id-response, category: category })
            (ok tip-id-response)
        )
    )
)

(define-public (tip-a-tip (target-tip-id uint) (amount uint) (message (string-utf8 280)))
    (let ((target-tip (unwrap! (map-get? tips { tip-id: target-tip-id }) err-not-found)))
        (send-tip (get sender target-tip) amount message)
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

;; Token tipping
(define-public (send-token-tip (token <sip-010-trait>) (recipient principal) (amount uint) (message (string-utf8 280)))
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

        (map-set token-tips { token-tip-id: tip-id }
            { sender: tx-sender, recipient: recipient, token-contract: token-principal, amount: amount, message: message, tip-height: block-height }
        )
        (var-set total-token-tips (+ tip-id u1))

        (print { event: "token-tip-sent", token-tip-id: tip-id, sender: tx-sender, recipient: recipient, token-contract: token-principal, amount: amount, message: message })
        (ok tip-id)
    )
)

;; Profile
(define-public (update-profile (display-name (string-utf8 50)) (bio (string-utf8 280)) (avatar-url (string-utf8 256)))
    (begin
        (asserts! (> (len display-name) u0) err-invalid-profile)
        (map-set user-profiles tx-sender { display-name: display-name, bio: bio, avatar-url: avatar-url })
        (print { event: "profile-updated", user: tx-sender, display-name: display-name })
        (ok true)
    )
)

;; Blocking
(define-public (toggle-block-user (user principal))
    (let ((new-state (not (default-to false (map-get? blocked-users { blocker: tx-sender, blocked: user })))))
        (map-set blocked-users { blocker: tx-sender, blocked: user } new-state)
        (print { event: "user-blocked", blocker: tx-sender, blocked: user, is-blocked: new-state })
        (ok new-state)
    )
)

;; Refunds
(define-public (request-refund (tip-id uint))
    (let
        (
            (tip (unwrap! (map-get? tips { tip-id: tip-id }) err-not-found))
        )
        (asserts! (not (var-get is-paused)) err-contract-paused)
        (asserts! (is-eq tx-sender (get sender tip)) err-not-tip-sender)
        (asserts! (is-none (map-get? refunded-tips { tip-id: tip-id })) err-already-refunded)
        (asserts! (is-none (map-get? refund-requests { tip-id: tip-id })) err-already-refunded)
        (asserts! (<= block-height (+ (get tip-height tip) refund-window-blocks)) err-refund-window-expired)

        (map-set refund-requests { tip-id: tip-id }
            { sender: (get sender tip), recipient: (get recipient tip), amount: (get amount tip), request-height: block-height, status: refund-status-pending }
        )
        (print { event: "refund-requested", tip-id: tip-id, sender: (get sender tip), recipient: (get recipient tip), amount: (get amount tip), request-height: block-height })
        (ok tip-id)
    )
)

(define-public (approve-refund (tip-id uint))
    (let
        (
            (request (unwrap! (map-get? refund-requests { tip-id: tip-id }) err-refund-not-found))
            (tip (unwrap! (map-get? tips { tip-id: tip-id }) err-not-found))
            (net-amount (- (get amount tip) (calculate-fee (get amount tip))))
        )
        (asserts! (not (var-get is-paused)) err-contract-paused)
        (asserts! (is-eq tx-sender (get recipient request)) err-not-authorized)
        (asserts! (is-eq (get status request) refund-status-pending) err-refund-not-pending)
        (asserts! (is-none (map-get? refunded-tips { tip-id: tip-id })) err-already-refunded)

        (try! (stx-transfer? net-amount tx-sender (get sender request)))

        (map-set refund-requests { tip-id: tip-id } (merge request { status: refund-status-approved }))
        (map-set refunded-tips { tip-id: tip-id } true)

        (let ((sent (default-to u0 (map-get? user-total-sent (get sender request)))))
            (map-set user-total-sent (get sender request) (if (>= sent (get amount tip)) (- sent (get amount tip)) u0))
        )
        (let ((recv (default-to u0 (map-get? user-total-received (get recipient request)))))
            (map-set user-total-received (get recipient request) (if (>= recv net-amount) (- recv net-amount) u0))
        )

        (print { event: "refund-approved", tip-id: tip-id, sender: (get sender request), recipient: (get recipient request), refund-amount: net-amount })
        (ok tip-id)
    )
)

(define-public (reject-refund (tip-id uint))
    (let ((request (unwrap! (map-get? refund-requests { tip-id: tip-id }) err-refund-not-found)))
        (asserts! (is-eq tx-sender (get recipient request)) err-not-authorized)
        (asserts! (is-eq (get status request) refund-status-pending) err-refund-not-pending)
        (map-set refund-requests { tip-id: tip-id } (merge request { status: refund-status-rejected }))
        (print { event: "refund-rejected", tip-id: tip-id, sender: (get sender request), recipient: (get recipient request) })
        (ok tip-id)
    )
)

;; Admin
(define-public (set-paused (paused bool))
    (begin
        (asserts! (is-admin) err-owner-only)
        (var-set is-paused paused)
        (print { event: "contract-paused", paused: paused })
        (ok true)
    )
)

(define-public (propose-fee-change (new-fee uint))
    (begin
        (asserts! (is-admin) err-owner-only)
        (asserts! (<= new-fee u1000) err-invalid-amount)
        (var-set pending-fee (some new-fee))
        (var-set pending-fee-height (+ block-height timelock-delay))
        (print { event: "fee-change-proposed", new-fee: new-fee, effective-height: (+ block-height timelock-delay) })
        (ok true)
    )
)

(define-public (execute-fee-change)
    (let ((new-fee (unwrap! (var-get pending-fee) err-no-pending-change)))
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

(define-public (whitelist-token (token-contract principal) (allowed bool))
    (begin
        (asserts! (is-admin) err-owner-only)
        (map-set whitelisted-tokens token-contract allowed)
        (print { event: "token-whitelist-updated", token-contract: token-contract, allowed: allowed })
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
    (let ((new-owner (unwrap! (var-get pending-owner) err-not-pending-owner)))
        (asserts! (is-eq tx-sender new-owner) err-not-pending-owner)
        (var-set contract-owner new-owner)
        (var-set pending-owner none)
        (print { event: "ownership-transferred", new-owner: new-owner })
        (ok true)
    )
)

;; Read-only
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
    { total-tips: (var-get total-tips-sent), total-volume: (var-get total-volume), platform-fees: (var-get platform-fees) }
)

(define-read-only (get-current-fee-basis-points)
    (ok (var-get current-fee-basis-points))
)

(define-read-only (get-fee-for-amount (amount uint))
    (ok (calculate-fee amount))
)

(define-read-only (get-fee-summary (amount uint))
    (let
        (
            (bps (var-get current-fee-basis-points))
            (computed-fee (calculate-fee amount))
        )
        (ok {
            fee-basis-points: bps,
            basis-points-divisor: basis-points-divisor,
            min-fee-ustx: min-fee,
            fee-percent: (/ (* bps u100) basis-points-divisor),
            fee-for-amount: computed-fee,
            amount: amount,
            net-amount: (if (>= amount computed-fee) (- amount computed-fee) u0)
        })
    )
)

(define-read-only (is-token-whitelisted (token-contract principal))
    (ok (default-to false (map-get? whitelisted-tokens token-contract)))
)

(define-read-only (get-refund-request (tip-id uint))
    (ok (map-get? refund-requests { tip-id: tip-id }))
)

(define-read-only (is-tip-refunded (tip-id uint))
    (ok (default-to false (map-get? refunded-tips { tip-id: tip-id })))
)

(define-read-only (get-refund-window-blocks)
    (ok refund-window-blocks)
)

(define-read-only (is-refund-eligible (tip-id uint))
    (match (map-get? tips { tip-id: tip-id })
        tip (ok (and
            (<= block-height (+ (get tip-height tip) refund-window-blocks))
            (is-none (map-get? refunded-tips { tip-id: tip-id }))
            (is-none (map-get? refund-requests { tip-id: tip-id }))
        ))
        (err err-not-found)
    )
)
