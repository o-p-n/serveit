package logger

import (
	"os"

	"github.com/sirupsen/logrus"
)

type UTCFormatter struct {
	logrus.Formatter
}

func (f UTCFormatter) Format(entry *logrus.Entry) ([]byte, error) {
	entry.Time = entry.Time.UTC()
	return f.Formatter.Format(entry)
}

var logger *logrus.Logger

func Logger() *logrus.Logger {
	if logger == nil {
		setup := logrus.New()
		setup.SetOutput(os.Stderr)
		setup.SetFormatter(UTCFormatter{&logrus.TextFormatter{
			ForceColors:   true,
			FullTimestamp: true,
			PadLevelText:  true,
		}})

		logger = setup
	}
	return logger
}

type Fields = logrus.Fields
type Level = logrus.Level

var ErrorLevel = logrus.ErrorLevel
var WarnLevel = logrus.WarnLevel
var InfoLevel = logrus.InfoLevel
var DebugLevel = logrus.DebugLevel
var TraceLevel = logrus.TraceLevel
