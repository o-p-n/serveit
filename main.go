package main

import (
	"net/http"
	"os"
	"path/filepath"

	"github.com/o-p-n/serveit/pkg/logger"
	"github.com/o-p-n/serveit/pkg/server"
)

// ##### MAIN #####

func main() {
	// init logging
	log := logger.Logger()

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
