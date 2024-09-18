package soutu

import (
	"bytes"
	"flag"
	"fmt"
	"log"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/jozsefsallai/gophersauce"
	zero "github.com/wdvxdr1123/ZeroBot"
	"github.com/wdvxdr1123/ZeroBot/message"
)

var sauce *gophersauce.Client
var command = "#soutu"

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
func Search(ctx *zero.Ctx, cmd string, img *message.MessageSegment) {
	flag.Parse()
	output := bytes.NewBuffer(nil)
	flagSet := flag.NewFlagSet(command, flag.ExitOnError)
	flagSet.Usage = func() {
		site := ""
		for _, s := range []string{
			"google", "yandex", "bing", "saucenao", "wait",
		} {
			site += "\n  " + s
		}
		fmt.Fprintln(flagSet.Output(), "回复图片使用")
		fmt.Fprintf(flagSet.Output(), "%s [Opt] [Site]:\n", command)
		fmt.Fprintf(flagSet.Output(), "Site:"+site+"\nOpt:\n")
		flagSet.PrintDefaults()
	}
	flagSet.SetOutput(output)
	showExternalURL := flagSet.Bool("e", false, "显示额外的链接")
	showOrigin := flagSet.Bool("o", false, "搜索来源")
	flagSet.Parse(strings.Split(cmd, " ")[1:])
	if img == nil {
		flagSet.Usage()
		ctx.Send(strings.TrimSuffix(strings.ReplaceAll(output.String(), "\t", "  "), "\n"))
		return
	}
	website := flagSet.Arg(0)
	if website != "" {
		msg := message.Message{}
		if ctx.Event.MessageType != "private" {
			msg = append(msg, message.Reply(ctx.Event.MessageID))
		}
		url := url.QueryEscape(img.Data["url"])
		switch website {
		case "google":
			msg = append(msg, message.Text("https://www.google.com/searchbyimage?&image_url="+url+"?&client=Chrome"))
		case "yandex":
			msg = append(msg, message.Text("https://yandex.com/images/search?url="+url+"&rpt=imageview"))
		case "bing":
			msg = append(msg, message.Text("https://www.bing.com/images/search?q=imgurl:"+url+"&view=detailv2&iss=sbi"))
		case "saucenao":
			msg = append(msg, message.Text("https://saucenao.com/search.php?url="+url))
		case "wait":
			msg = append(msg, message.Text("https://trace.moe/?auto&url="+url))
		}
		ctx.Send(msg)
		return
	}
	image_url := img.Data["url"]
	resp, err := sauce.FromURL(image_url)
	if err != nil {
		fmt.Println(err)
		ctx.Send("请求 SauceNao 时出错")
		return
	}
	result := resp.Results[0]
	similarity, _ := strconv.ParseFloat(result.Header.Similarity, 64)

	if similarity < 70 {
		ctx.Send("没找到")
		return
	}
	msg := message.Message{}
	defer func() {
		ctx.Send(msg)
	}()
	if ctx.Event.MessageType != "private" {
		msg = append(msg, message.Reply(ctx.Event.MessageID))
	}
	if !*showOrigin && !*showExternalURL && result.Data.DanbooruID != 0 {
		source, err := GetDanbooruSource(result.Data.DanbooruID)
		if err != nil {
			msg = append(msg, message.Text("请求 Danbooru 时出现错误"))
			fmt.Println(err)
			return
		}
		msg = append(msg, message.ImageBytes(source))
	} else {
		msg = append(msg,
			message.Image(result.Header.Thumbnail),
			message.Text(result.Data.Source),
		)
		if *showExternalURL {
			for _, url := range result.Data.ExternalURLs {
				msg = append(msg, message.Text("\n"+url))
			}
		}
	}

}
func Register() {
	zero.OnMessage(func(ctx *zero.Ctx) bool {
		if ctx.Event.Message[0].Type != "reply" {
			return false
		}
		if ctx.Event.Message[1].Type != "text" && !strings.HasPrefix(ctx.Event.Message[1].Data["text"], command) {
			return false
		}
		reply := ctx.GetMessage(message.NewMessageIDFromString(ctx.Event.Message[0].Data["id"]))
		return reply.Elements[0].Type == "image"
	}).Handle(func(ctx *zero.Ctx) {
		reply := ctx.GetMessage(message.NewMessageIDFromString(ctx.Event.Message[0].Data["id"]))
		image := reply.Elements[0]
		Search(ctx, ctx.Event.Message[1].Data["text"], &image)
	})
	zero.OnCommand("soutu").Handle(func(ctx *zero.Ctx) {
		Search(ctx, ctx.Event.Message[0].Data["text"], nil)
	})
}
