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
    pub fn defaults() -> Self {
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
    fn impl_default() {
        let settings = Settings::default();
        assert_eq!(settings.port(), 4000);
        assert_eq!(settings.root_dir(), ".");
    }

    #[test]
    fn loads_with_defaults() {
        let settings = with_vars([("DUMMY_VAR", Some("1"))], || Settings::defaults());
        assert_eq!(settings.port(), 4000);
        assert_eq!(settings.root_dir(), ".");
    }

    #[test]
    fn loads_with_envvars() {
        let settings = with_vars(
            [
                ("SERVEIT_PORT", Some("4000")),
                ("SERVEIT_ROOT_DIR", Some("/app/web")),
            ],
            || Settings::defaults(),
        );
        assert_eq!(settings.port(), 4000);
        assert_eq!(settings.root_dir(), "/app/web");
    }
}
