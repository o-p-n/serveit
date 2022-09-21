package server

import (
	"net/http"
	"os"
	"path"

	"github.com/o-p-n/serveit/pkg/errs"
)

type FileServerHandler struct {
	Root string
}

func NewServer(rootPath string) *http.Server {
	handler := &FileServerHandler{
		Root: rootPath,
	}

	return &http.Server{
		Addr:    ":4000",
		Handler: handler,
	}
}

func (srv *FileServerHandler) makeRequest(req *http.Request) *FileServerRequest {
	return NewRequest(srv, req)
}

func (srv *FileServerHandler) lookupEntry(filePath string) (*FileEntry, *errs.FileServerError) {
	loc := path.Join(srv.Root, filePath)

	info, err := os.Lstat(loc)
	if err != nil {
		return nil, errs.NewError("could not stat").
			WithPath(filePath).
			WithCause(err)
	}

	mode := info.Mode()
	if mode.IsDir() {
		// assume index
		return srv.lookupEntry(path.Join(filePath, "index.html"))
	} else if !mode.IsRegular() {
		return nil, errs.NewError("not a regular file").
			WithPath(filePath)
	}

	return &FileEntry{
		Path: filePath,
		Info: info,
	}, nil
}

func (srv *FileServerHandler) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	fsreq := srv.makeRequest(req)
	defer fsreq.Close(w)

	// lookup entry
	if err := fsreq.Lookup(); err != nil {
		return
	}
	// pipe entry contents
	fsreq.Pipe(w)
}
