import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).parent.parent))

from src.main import main


if __name__ == "__main__":
    main()