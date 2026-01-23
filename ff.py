import os
import shutil

def flatten_django_apps(source_dir, target_dir, files_to_copy=None):
    """
    Copies selected files from each app folder into a single folder
    and renames them as AppName_filename.py
    """

    if files_to_copy is None:
        files_to_copy = ["views.py", "urls.py", "models.py", "serializers.py"]

    os.makedirs(target_dir, exist_ok=True)

    for app_name in os.listdir(source_dir):
        app_path = os.path.join(source_dir, app_name)

        if not os.path.isdir(app_path):
            continue

        for file_name in files_to_copy:
            src_file = os.path.join(app_path, file_name)

            if os.path.isfile(src_file):
                new_file_name = f"{app_name}_{file_name}"
                dst_file = os.path.join(target_dir, new_file_name)

                shutil.copy2(src_file, dst_file)


flatten_django_apps(
    source_dir=r"C:\Users\Divyam Shah\OneDrive\Desktop\Dynamic Labz\Clients\Clients\EcoReco\RefurBazaar\RefurBazaar",
    target_dir="flattened_files"
)
