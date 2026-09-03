import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent
project_dir_str = str(PROJECT_DIR)
if project_dir_str not in sys.path:
    sys.path.insert(0, project_dir_str)

from main import app as application

if __name__ == "__main__":
    application.run()
