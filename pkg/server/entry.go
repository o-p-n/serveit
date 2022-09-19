package server

import (
	"os"
	"path"

	"github.com/o-p-n/serveit/pkg/errs"
)

type FileEntry struct {
	Path string
	Info os.FileInfo
}

func (e *FileEntry) Open(root string) (*os.File, *errs.FileServerError) {
	loc := path.Join(root, e.Path)
	if f, err := os.Open(loc); err != nil {
		return nil, errs.NewError("could not open file").
			WithPath(e.Path).
			WithCause(err)
	} else {
		return f, nil
	}
}
