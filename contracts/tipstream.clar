;; TipStream - Micro-tipping platform on Stacks
;; Version: 1.0.0

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-invalid-amount (err u101))
(define-constant err-insufficient-balance (err u102))
(define-constant err-transfer-failed (err u103))
(define-constant err-not-found (err u104))
(define-constant err-invalid-profile (err u105))
(define-constant err-user-blocked (err u106))
(define-constant err-contract-paused (err u107))

(define-constant basis-points-divisor u10000)

;; Data Variables
(define-data-var total-tips-sent uint u0)
(define-data-var total-volume uint u0)
(define-data-var platform-fees uint u0)
(define-data-var is-paused bool false)
(define-data-var current-fee-basis-points uint u50)

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

;; Private Functions
(define-private (calculate-fee (amount uint))
    (/ (* amount (var-get current-fee-basis-points)) basis-points-divisor)
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
        (asserts! (> amount u0) err-invalid-amount)
        (asserts! (not (is-eq tx-sender recipient)) err-invalid-amount)
        (asserts! (not (default-to false (map-get? blocked-users { blocker: recipient, blocked: tx-sender }))) err-user-blocked)
        
        (try! (stx-transfer? net-amount tx-sender recipient))
        (try! (stx-transfer? fee tx-sender contract-owner))
        
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
        (ok true)
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

;; Privacy Functions
(define-public (toggle-block-user (user principal))
    (let
        (
            (is-blocked (default-to false (map-get? blocked-users { blocker: tx-sender, blocked: user })))
        )
        (map-set blocked-users { blocker: tx-sender, blocked: user } (not is-blocked))
        (ok (not is-blocked))
    )
)

;; Admin Functions
(define-public (set-paused (paused bool))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set is-paused paused)
        (ok true)
    )
)

(define-public (set-fee-basis-points (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (asserts! (<= new-fee u1000) err-invalid-amount) ;; Max 10%
        (var-set current-fee-basis-points new-fee)
        (ok true)
    )
)

(define-public (send-batch-tips (tips-list (list 50 { recipient: principal, amount: uint, message: (string-utf8 280) })))
    (ok (map send-tip-tuple tips-list))
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

(define-read-only (get-fee-for-amount (amount uint))
    (ok (calculate-fee amount))
)
