package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
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
	srv := server.NewServer(root)

	srvClosed := make(chan struct{}, 1)

	go func() {
		sigchan := make(chan os.Signal, 1)
		signal.Notify(sigchan, os.Interrupt)

		<-sigchan

		log.Info("shutting down serveit")
		srv.Shutdown(context.Background())

		close(srvClosed)
	}()

	log.Infof("starting to serveit from %s", root)
	if err := srv.ListenAndServe(); err != http.ErrServerClosed {
		log.WithFields(logger.Fields{
			"error": err,
		}).Error("server failed")
	}

	<-srvClosed
	log.Info("serveit shut down")
}
