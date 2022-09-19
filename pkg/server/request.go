package server

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"time"

	mime "github.com/gabriel-vasile/mimetype"
	"github.com/o-p-n/serveit/pkg/errs"
	"github.com/o-p-n/serveit/pkg/logger"
)

type FileServerRequest struct {
	Server   *FileServer
	Request  *http.Request
	Path     string
	Entry    *FileEntry
	File     *os.File
	Error    *errs.FileServerError
	Complete bool
	Started  time.Time
	Stopped  time.Time
}

func NewRequest(srv *FileServer, req *http.Request) *FileServerRequest {
	return &FileServerRequest{
		Server:  srv,
		Request: req,
		Path:    req.URL.Path,
		Started: time.Now(),
	}
}

func (fsreq *FileServerRequest) Close(w http.ResponseWriter) {
	log := logger.Logger()

	fsreq.Stopped = time.Now()
	if f := fsreq.File; f != nil {
		f.Close()
	}

	// send response to client
	if !fsreq.Complete {
		if err := fsreq.Error; err != nil {
			w.WriteHeader(err.Status)
			w.Write([]byte("not found"))
		} else {
			w.WriteHeader(201)
		}
	}

	filePath := fsreq.Request.URL.Path
	var msg string
	var fields logger.Fields
	var level logger.Level
	if e := fsreq.Error; e != nil {
		msg = "request failed"
		level = logger.ErrorLevel
		fields = logger.Fields{
			"path":    filePath,
			"status":  e.Status,
			"error":   e,
			"elapsed": fsreq.Stopped.Sub(fsreq.Started),
		}
	} else {
		msg = "request handled"
		level = logger.InfoLevel
		fields = logger.Fields{
			"path":    filePath,
			"status":  200,
			"elapsed": fsreq.Stopped.Sub(fsreq.Started),
		}
	}
	log.WithFields(fields).Log(level, msg)
}

func (fsreq *FileServerRequest) Lookup() error {
	if entry, err := fsreq.Server.lookupEntry(fsreq.Path); err != nil {
		fsreq.Error = err
		return err
	} else {
		fsreq.Entry = entry
		return nil
	}
}

func (fsreq *FileServerRequest) Pipe(w http.ResponseWriter) error {
	entry := fsreq.Entry
	fileRoot := fsreq.Server.Root

	var fd *os.File
	if f, err := os.Open(path.Join(fileRoot, entry.Path)); err != nil {
		fsreq.Error = errs.NewError("could not open file").
			WithPath(entry.Path).
			WithCause(err)
		return err
	} else {
		fd = f
	}

	// Determine Media Type (then reset)
	mtype, mErr := mime.DetectReader(fd)
	if mErr != nil {
		mtype = mime.Lookup("application/octet-stream")
	}
	fd.Seek(0, 0)

	// Write header and contents
	fsreq.Complete = true
	w.Header().Set("Content-Type", fmt.Sprint(mtype))
	w.Header().Set("Content-Length", fmt.Sprint(entry.Info.Size()))
	w.WriteHeader(200)
	if _, err := io.Copy(w, fd); err != nil {
		fsreq.Error = errs.NewError("copy failed").
			WithPath(entry.Path).
			WithCause(err)
		return err
	}

	return nil
}
