;; TipStream Test Token
;; A simple SIP-010 compliant token for testing token tipping functionality
;; This contract is for testing purposes only

(impl-trait .tipstream-traits.sip-010-trait)

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_OWNER_ONLY (err u100))
(define-constant ERR_NOT_TOKEN_OWNER (err u101))
(define-constant ERR_INSUFFICIENT_BALANCE (err u102))

;; Data Variables
(define-data-var token-name (string-ascii 32) "TipStream Token")
(define-data-var token-symbol (string-ascii 32) "TIPS")
(define-data-var token-decimals uint u6)
(define-data-var token-uri (optional (string-utf8 256)) none)

;; Data Maps
(define-map balances principal uint)

;; Private Functions
(define-private (get-balance-uint (account principal))
    (default-to u0 (map-get? balances account))
)

;; SIP-010 Functions

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (is-eq tx-sender sender) ERR_NOT_TOKEN_OWNER)
        (asserts! (>= (get-balance-uint sender) amount) ERR_INSUFFICIENT_BALANCE)
        (map-set balances sender (- (get-balance-uint sender) amount))
        (map-set balances recipient (+ (get-balance-uint recipient) amount))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok (var-get token-name))
)

(define-read-only (get-symbol)
    (ok (var-get token-symbol))
)

(define-read-only (get-decimals)
    (ok (var-get token-decimals))
)

(define-read-only (get-balance (account principal))
    (ok (get-balance-uint account))
)

(define-read-only (get-total-supply)
    (ok u0)
)

(define-read-only (get-token-uri)
    (ok (var-get token-uri))
)

;; Admin Functions

(define-public (mint (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
        (map-set balances recipient (+ (get-balance-uint recipient) amount))
        (ok true)
    )
)
