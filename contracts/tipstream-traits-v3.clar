(define-trait sip-010-trait
    (
        (transfer (uint principal principal (optional (buff 34))) (response bool uint))
        (get-name () (response (string-ascii 32) uint))
        (get-symbol () (response (string-ascii 32) uint))
        (get-decimals () (response uint uint))
        (get-balance (principal) (response uint uint))
        (get-total-supply () (response uint uint))
        (get-token-uri () (response (optional (string-utf8 256)) uint))
    )
)

(define-data-var contract-owner principal tx-sender)

(define-map registered-tokens principal bool)

(define-public (register-token (token principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) (err u401))
        (map-set registered-tokens token true)
        (ok true)
    )
)

(define-public (deregister-token (token principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) (err u401))
        (map-set registered-tokens token false)
        (ok true)
    )
)

(define-read-only (is-registered (token principal))
    (default-to false (map-get? registered-tokens token))
)

(define-public (transfer-ownership (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) (err u401))
        (var-set contract-owner new-owner)
        (ok true)
    )
)

(define-read-only (get-owner)
    (ok (var-get contract-owner))
)
