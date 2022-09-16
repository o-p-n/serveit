package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"sync"
	"time"

	mime "github.com/gabriel-vasile/mimetype"
	log "github.com/sirupsen/logrus"
)

// ##### File Server Errors #####

type fileServerError struct {
	status  int
	message string
}

func (e *fileServerError) Error() string {
	return fmt.Sprintf("%d: %s", e.status, e.message)
}

func NewFileServerError(message string) *fileServerError {
	return &fileServerError{
		status:  404,
		message: message,
	}
}

// ##### File Server #####

type fileEntry struct {
	fd   *os.File
	info os.FileInfo
}

type fileServer struct {
	mux  sync.RWMutex
	root string
}

func (fs *fileServer) openFile(filePath string) (*fileEntry, *fileServerError) {
	loc := path.Join(fs.root, filePath)

	info, err := os.Lstat(loc)
	if err != nil {
		return nil, NewFileServerError(fmt.Sprintf("%s could not be statted: %v", filePath, err))
	}

	mode := info.Mode()
	if mode.IsDir() {
		// assume index
		return fs.openFile(path.Join(filePath, "index.html"))
	} else if !mode.IsRegular() {
		return nil, NewFileServerError(fmt.Sprintf("%s is not a regular file", filePath))
	}

	f, err := os.Open(loc)
	if err != nil {
		return nil, NewFileServerError(fmt.Sprintf("%s could not be opened: %v", filePath, err))
	}
	return &fileEntry{fd: f, info: info}, nil
}
func (fs *fileServer) pipeFile(w http.ResponseWriter, entry *fileEntry) error {
	defer entry.fd.Close()

	_, err := io.Copy(w, entry.fd)

	return err
}

func (fs *fileServer) loggit(start time.Time, level log.Level, msg string, fields log.Fields) {
	delta := time.Since(start)
	fields["time"] = delta
	log.WithFields(fields).Log(level, msg)
}

func (fs *fileServer) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	tsStart := time.Now()

	filePath := req.URL.Path
	entry, err := fs.openFile(filePath)
	if err != nil {
		w.WriteHeader(err.status)
		w.Write([]byte("not found"))
		fs.loggit(tsStart, log.ErrorLevel, "request failed", log.Fields{
			"status": err.status,
			"path":   filePath,
			"error":  err,
		})
		return
	}

	mtype, mErr := mime.DetectReader(entry.fd)
	if mErr != nil {
		mtype = mime.Lookup("application/octet-stream")
	}
	entry.fd.Seek(0, 0)

	w.Header().Set("Content-Length", fmt.Sprint(entry.info.Size()))
	w.Header().Set("Content-Type", fmt.Sprint(mtype))
	w.WriteHeader(200)
	fs.pipeFile(w, entry)
	fs.loggit(tsStart, log.InfoLevel, "request handled", log.Fields{
		"status": 200,
		"path":   filePath,
	})
}

func newFileServer(root string) *fileServer {
	fs := fileServer{
		root: root,
	}

	return &fs
}

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
	handler := newFileServer(root)

	log.Infof("starting to servit from %s", root)
	http.ListenAndServe(":4000", handler)
}
