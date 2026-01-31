;; TipStream - Micro-tipping platform on Stacks
;; Version: 1.0.0

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-invalid-amount (err u101))
(define-constant err-insufficient-balance (err u102))
(define-constant err-transfer-failed (err u103))
(define-constant err-not-found (err u104))

;; Fee percentage (0.5% = 50 basis points)
(define-constant fee-basis-points u50)
(define-constant basis-points-divisor u10000)

;; Data Variables
(define-data-var total-tips-sent uint u0)
(define-data-var total-volume uint u0)
(define-data-var platform-fees uint u0)

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

;; Private Functions
(define-private (calculate-fee (amount uint))
    (/ (* amount fee-basis-points) basis-points-divisor)
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
        (asserts! (> amount u0) err-invalid-amount)
        (asserts! (not (is-eq tx-sender recipient)) err-invalid-amount)
        
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

(define-public (tip-a-tip (target-tip-id uint) (amount uint) (message (string-utf8 280)))
    (let
        (
            (target-tip (unwrap! (map-get? tips { tip-id: target-tip-id }) err-not-found))
            (original-sender (get sender target-tip))
        )
        (send-tip original-sender amount message)
    )
)

;; Read-only Functions
(define-read-only (get-tip (tip-id uint))
    (map-get? tips { tip-id: tip-id })
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
