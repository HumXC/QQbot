package main

import (
	"fmt"
	"os"
	"qqbot/modules"

	log "github.com/sirupsen/logrus"
	easy "github.com/t-tomalak/logrus-easy-formatter"

	_ "github.com/joho/godotenv/autoload"
	zero "github.com/wdvxdr1123/ZeroBot"
	"github.com/wdvxdr1123/ZeroBot/driver"
)

func init() {
	log.SetFormatter(&easy.Formatter{
		TimestampFormat: "2006-01-02 15:04:05",
		LogFormat:       "[zero][%time%][%lvl%]: %msg% \n",
	})
	log.SetLevel(log.InfoLevel)
}

func main() {
	modules.RegisterAll()
	addr := os.Getenv("ONEBOT_ADDR")
	if addr == "" {
		fmt.Println("Need environment [ONEBOT_ADDR]")
		return
	}
	zero.RunAndBlock(&zero.Config{
		NickName:      []string{"bot"},
		CommandPrefix: "#",
		Driver: []zero.Driver{
			driver.NewWebSocketClient("ws://"+addr, ""),
		},
	}, nil)
}
