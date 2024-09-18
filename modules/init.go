package modules

import (
	"qqbot/modules/estrus"
	"qqbot/modules/soutu"
)

func RegisterAll() {
	soutu.Register()
	estrus.Register()
}
