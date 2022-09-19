package errs

import "fmt"

type FileServerError struct {
	Status  int
	Message string
	Path    string
	Cause   error
}

func NewError(msg string, args ...interface{}) *FileServerError {
	return &FileServerError{
		Status:  404,
		Message: fmt.Sprintf(msg, args...),
	}
}

func (e *FileServerError) WithPath(p string) *FileServerError {
	e.Path = p
	return e
}

func (e *FileServerError) WithStatus(status int) *FileServerError {
	e.Status = status
	return e
}

func (e *FileServerError) WithCause(err error) *FileServerError {
	e.Cause = err

	return e
}

func (e *FileServerError) Error() string {
	var cause string
	if e.Cause != nil {
		cause = fmt.Sprint(e.Cause)
	}
	return fmt.Sprintf("%T(%s) %d: %s [%s]", *e, e.Path, e.Status, e.Message, cause)
}
