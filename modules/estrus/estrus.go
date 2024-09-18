package estrus

import (
	"qqbot/modules/estrus/images"
	"time"

	zero "github.com/wdvxdr1123/ZeroBot"
	"github.com/wdvxdr1123/ZeroBot/message"
)

type state struct {
	t *time.Timer
	c int64
	o bool
}

var status = make(map[int64]state)

func Register() {
	interval := 10 * time.Minute
	zero.OnNotice(func(ctx *zero.Ctx) bool {
		return ctx.Event.SubType == "poke"
	}).Handle(func(ctx *zero.Ctx) {
		id := ctx.Event.GroupID
		if id == 0 {
			id = ctx.Event.UserID
		}
		s, ok := status[id]
		if !ok {
			t := time.NewTimer(interval)
			s = state{t: t}
			go func() {
				<-t.C
				delete(status, id)
			}()
		}
		if s.o {
			return
		}
		s.c += 1
		s.t.Reset(interval)
		var img []byte
		switch {
		case s.c > 15:
			s.t.Reset(3 * time.Minute)
			s.o = true
			img = images.Images[5]
		case s.c > 12:
			img = images.Images[4]
		case s.c > 9:
			img = images.Images[3]
		case s.c > 7:
			img = images.Images[2]
		case s.c > 5:
			img = images.Images[1]
		case s.c > 2:
			img = images.Images[0]
		}
		if img != nil {
			ctx.Send(message.ImageBytes(img))
		}
		status[id] = s
	})
}
