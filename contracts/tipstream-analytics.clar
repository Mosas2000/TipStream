;; tipstream-analytics
;; Event analytics tracking

(define-data-var total-events uint u0)

(define-map events uint {
  creator: principal,
  value: uint,
  at-block: uint
})

(define-public (log-event (event-type uint))
  (let ((id (var-get total-events)))
    (map-set events id {
      creator: tx-sender,
      value: event-type,
      at-block: block-height
    })
    (var-set total-events (+ id u1))
    (ok id)
  )
)

(define-read-only (get-entry (id uint))
  (map-get? events id)
)

(define-read-only (get-total)
  (ok (var-get total-events))
)
