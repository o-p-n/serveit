package errs

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

func TestErrors(t *testing.T) {
	suite.Run(t, new(ErrorsTestSuite))
}

type ErrorsTestSuite struct{ suite.Suite }

func (suite *ErrorsTestSuite) TestCreate() {
	T := suite.T()

	var err *FileServerError

	err = NewError("error message")
	assert.Equal(T, err, &FileServerError{
		Status:  404,
		Message: "error message",
		Path:    "",
		Cause:   nil,
	})

	err = NewError("error message with args: %s %s", "first", "second")
	assert.Equal(T, err, &FileServerError{
		Status:  404,
		Message: "error message with args: first second",
		Path:    "",
		Cause:   nil,
	})
}

func (suite *ErrorsTestSuite) TestWithStatus() {
	T := suite.T()

	var returned *FileServerError

	err := NewError("error message")
	assert.Equal(T, err.Status, 404)

	returned = err.WithStatus(400)
	assert.Same(T, returned, err)
	assert.Equal(T, err.Status, 400)

	returned = err.WithStatus(504)
	assert.Same(T, returned, err)
	assert.Equal(T, err.Status, 504)
}

func (suite *ErrorsTestSuite) TestWithCause() {
	T := suite.T()

	var returned *FileServerError

	err := NewError("error message")
	cause := fmt.Errorf("cause of error")

	returned = err.WithCause(cause)
	assert.Same(T, returned, err)
	assert.Equal(T, err.Cause, cause)

	returned = err.WithCause(nil)
	assert.Same(T, returned, err)
	assert.Nil(T, err.Cause)
}

func (suite *ErrorsTestSuite) TestWithPath() {
	T := suite.T()

	var returned *FileServerError

	err := NewError("error message")

	returned = err.WithPath("/favicon.ico")
	assert.Same(T, returned, err)
	assert.Equal(T, err.Path, "/favicon.ico")

	returned = err.WithPath("")
	assert.Same(T, err, returned)
	assert.Equal(T, err.Path, "")
}

func (suite *ErrorsTestSuite) TestErrorString() {
	T := suite.T()

	var err *FileServerError

	err = NewError("simple error")
	assert.Equal(T, fmt.Sprint(err), "errs.FileServerError() 404: simple error []")
	err = NewError("test error").
		WithPath("/favicon.ico").
		WithCause(fmt.Errorf("error cause")).
		WithStatus(400)
	assert.Equal(T, fmt.Sprint(err), "errs.FileServerError(/favicon.ico) 400: test error [error cause]")
}
