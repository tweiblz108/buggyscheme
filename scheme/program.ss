((lambda (n) (if 
  (< n 15000)
  (#lambda (+ n 1))
  (display (+ n n n)) 
)) 1)
; ((lambda (n m) n m (+ n m)) 1 2)
; ((lambda (n) (if (< n 10) (#lambda (+ n 1)) n)) 1)
;((lambda (n) (#lambda (+ n 1)) 1))