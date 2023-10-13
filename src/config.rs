use config::{Config, Environment};
use serde_derive::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Settings {
    root_dir: String,
    port: u16,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            root_dir: String::from("."),
            port: 4000,
        }
    }
}

impl Settings {
    pub fn from_env() -> Self {
        let cfg = Config::builder()
            .set_default("root_dir", String::from("."))
            .unwrap()
            .set_default("port", 4000)
            .unwrap()
            .add_source(Environment::with_prefix("SERVEIT").try_parsing(true))
            .build()
            .unwrap();

        let settings: Settings = cfg.try_deserialize().unwrap();
        settings
    }

    pub fn root_dir(&self) -> &str {
        self.root_dir.as_str()
    }

    pub fn port(&self) -> u16 {
        self.port
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use temp_env::with_vars;

    #[test]
    fn loads_from_default() {
        let settings = Settings::default();
        assert_eq!(settings.port(), 4000);
        assert_eq!(settings.root_dir(), ".");
    }

    #[test]
    fn loads_from_env_defaults() {
        let settings = with_vars([("DUMMY_VAR", Some("1"))], || Settings::from_env());
        assert_eq!(settings.port(), 4000);
        assert_eq!(settings.root_dir(), ".");
    }

    #[test]
    fn loads_from_env_allset() {
        let settings = with_vars(
            [
                ("SERVEIT_PORT", Some("4000")),
                ("SERVEIT_ROOT_DIR", Some("/app/web")),
            ],
            || Settings::from_env(),
        );
        assert_eq!(settings.port(), 4000);
        assert_eq!(settings.root_dir(), "/app/web");
    }
}
