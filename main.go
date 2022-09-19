package main

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/o-p-n/serveit/pkg/server"
	log "github.com/sirupsen/logrus"
)

// ##### MAIN #####

type UTCFormatter struct {
	log.Formatter
}

func (f UTCFormatter) Format(entry *log.Entry) ([]byte, error) {
	entry.Time = entry.Time.UTC()
	return f.Formatter.Format(entry)
}

func main() {
	// init logging
	log.SetOutput(os.Stderr)
	log.SetFormatter(UTCFormatter{&log.TextFormatter{
		ForceColors:   true,
		FullTimestamp: true,
		PadLevelText:  true,
	}})

	var root string
	if len(os.Args) >= 2 {
		root, _ = filepath.Abs(os.Args[1])
	} else {
		root, _ = os.Getwd()
	}
	handler := server.NewServer(root)

	log.Infof("starting to serveit from %s", root)
	http.ListenAndServe(":4000", handler)
	log.Info("shutting down serveit")
}
