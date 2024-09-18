package rules

import zero "github.com/wdvxdr1123/ZeroBot"

func MessageType(t string) zero.Rule {
	return func(ctx *zero.Ctx) bool {
		return ctx.Event.MessageType == t
	}
}
