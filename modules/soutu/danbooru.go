package soutu

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
)

var danbooruURL, _ = url.Parse(fmt.Sprintf("https://danbooru.donmai.us/?api_key=%s&login=%s", os.Getenv("DANBOORU_API_KEY"), os.Getenv("DANBOORU_LOGIN")))

func GetDanbooruSource(id int) ([]byte, error) {
	ur := danbooruURL.JoinPath("posts", strconv.Itoa(id)+".json")
	resp, err := http.Get(ur.String())
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf(resp.Status)
	}
	data, _ := io.ReadAll(resp.Body)
	result := make(map[string]string)
	json.Unmarshal(data, &result)
	resp, _ = http.Get(result["file_url"])
	image, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	return image, nil
}
