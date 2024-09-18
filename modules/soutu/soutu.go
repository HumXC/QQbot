package soutu

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/jozsefsallai/gophersauce"
	zero "github.com/wdvxdr1123/ZeroBot"
	"github.com/wdvxdr1123/ZeroBot/message"
)

var sauce *gophersauce.Client

func init() {
	var err error
	sauce, err = gophersauce.NewClient(&gophersauce.Settings{
		MaxResults: 1,
		APIKey:     os.Getenv("SAUCENAO_APIKEY"),
	})
	if err != nil {
		log.Fatal(err)
	}
}
func Search(ctx *zero.Ctx, img message.MessageSegment) {
	image_url := img.Data["url"]
	resp, err := sauce.FromURL(image_url)
	if err != nil {
		fmt.Println(err)
		return
	}
	result := resp.Results[0]
	similarity, _ := strconv.ParseFloat(result.Header.Similarity, 64)

	if similarity < 70 {
		ctx.Send("没找到")
		return
	}
	msg := message.Message{}
	if ctx.Event.MessageType != "private" {
		msg = append(msg, message.Reply(ctx.Event.MessageID))
	}
	msg = append(msg,
		message.Image(result.Header.Thumbnail),
		message.Text(result.Data.Source+"\n\n"),
	)
	if len(result.Data.ExternalURLs) > 0 {
		msg = append(msg, message.Text(result.Data.ExternalURLs[0]))
	}
	ctx.Send(msg)
}
func Register() {
	zero.OnMessage(func(ctx *zero.Ctx) bool {
		if ctx.Event.Message[0].Type != "reply" {
			return false
		}
		if ctx.Event.Message[1].Type != "text" && ctx.Event.Message[1].Data["text"] != "#soutu" {
			return false
		}
		reply := ctx.GetMessage(message.NewMessageIDFromString(ctx.Event.Message[0].Data["id"]))
		return reply.Elements[0].Type == "image"
	}).Handle(func(ctx *zero.Ctx) {
		reply := ctx.GetMessage(message.NewMessageIDFromString(ctx.Event.Message[0].Data["id"]))
		image := reply.Elements[0]
		Search(ctx, image)
	})
}
