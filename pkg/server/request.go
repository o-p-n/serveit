package server

import (
	"crypto/sha256"
	"encoding/hex"
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
	Server   *FileServerHandler
	Request  *http.Request
	Path     string
	Entry    *FileEntry
	File     *os.File
	Error    *errs.FileServerError
	Status   int
	Complete bool
	Started  time.Time
	Stopped  time.Time
}

func NewRequest(srv *FileServerHandler, req *http.Request) *FileServerRequest {
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
			"status":  fsreq.Status,
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

func (fsreq *FileServerRequest) checkMatch() bool {
	values, exists := fsreq.Request.Header["If-None-Match"]
	logger.Logger().WithFields(logger.Fields{
		"path":   fsreq.Entry.Path,
		"etag":   fsreq.Entry.Tag,
		"values": values,
	}).Debug("checking for match")
	if exists && len(values) > 0 {
		return fsreq.Entry.Tag == values[0]
	}
	return false
}
func (fsreq *FileServerRequest) Pipe(w http.ResponseWriter) error {
	entry := fsreq.Entry
	srv := fsreq.Server
	fileRoot := srv.Root

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
	var mType string

	ext := path.Ext(entry.Path)
	if (ext == ".css") {
		mType = "text/css"
	} else {
		mtypeObj, mErr := mime.DetectReader(fd)
		if mErr != nil {
			mtypeObj = mime.Lookup("application/octet-stream")
		}
		fd.Seek(0, 0)
		mType = mtypeObj.String()
	}
	
	// Calculate Hash
	hasher := sha256.New()
	if _, err := io.Copy(hasher, fd); err != nil {
		fsreq.Error = errs.NewError("digest failed").
			WithPath(entry.Path).
			WithCause(err)
		return err
	}
	entry.Tag = hex.EncodeToString(hasher.Sum(nil))
	fd.Seek(0, 0)

	// Write header and contents
	fsreq.Complete = true

	if fsreq.checkMatch() {
		fsreq.Status = 304
		w.Header().Set("Etag", entry.Tag)
		w.WriteHeader(fsreq.Status)
	} else {
		fsreq.Status = 200
		w.Header().Set("Content-Type", fmt.Sprint(mType))
		w.Header().Set("Content-Length", fmt.Sprint(entry.Info.Size()))
		w.Header().Set("Etag", entry.Tag)
		w.WriteHeader(fsreq.Status)
		if _, err := io.Copy(w, fd); err != nil {
			fsreq.Error = errs.NewError("copy failed").
				WithPath(entry.Path).
				WithCause(err)
			return err
		}
	}

	return nil
}
