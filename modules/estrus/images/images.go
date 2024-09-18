package images

import _ "embed"

//go:embed 0.jpg
var p0 []byte

//go:embed 1.jpg
var p1 []byte

//go:embed 2.jpg
var p2 []byte

//go:embed 3.jpg
var p3 []byte

//go:embed 4.jpg
var p4 []byte

//go:embed 5.jpg
var p5 []byte

var Images = [][]byte{p0, p1, p2, p3, p4, p5}
