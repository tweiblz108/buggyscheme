((lambda (n) (if 
  (< n 10000000)
  (#lambda (+ n 1))
  (display n) 
)) 1)
; ((lambda (n) (if (< n 10) (#lambda (+ n 1)) n)) 1)
;((lambda (n) (#lambda (+ n 1)) 1))