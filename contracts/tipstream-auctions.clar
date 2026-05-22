;; tipstream-auctions
;; Auction system

(define-data-var total-auctions uint u0)

(define-map auctions uint {
  creator: principal,
  value: uint,
  at-block: uint
})

(define-public (create-auction (start-price uint))
  (let ((id (var-get total-auctions)))
    (map-set auctions id {
      creator: tx-sender,
      value: start-price,
      at-block: block-height
    })
    (var-set total-auctions (+ id u1))
    (ok id)
  )
)

(define-read-only (get-entry (id uint))
  (map-get? auctions id)
)

(define-read-only (get-total)
  (ok (var-get total-auctions))
)
