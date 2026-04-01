from __future__ import annotations


def default_code_template(language: str) -> str:
    if language == "javascript":
        return """function main() {
  const message = "Hello from Collaborative IDE";
  console.log(message);
}

main();
"""
    return """def main() -> None:
    message = "Hello from Collaborative IDE"
    print(message)


if __name__ == "__main__":
    main()
"""