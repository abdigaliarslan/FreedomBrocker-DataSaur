import paramiko
import sys
import os

hostname = "178.88.115.213"
username = "root"
password = "iG2aR8pX5c"
migration_path = r"C:\Users\Rauan Akhmetov\Desktop\Datasaur\FreedomBrocker-DataSaur\backend\migrations\011_n8n_full_compat.sql"

def apply_migration():
    try:
        # Read migration file
        with open(migration_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        # Connect via SSH
        print(f"Connecting to {hostname}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(hostname, username=username, password=password)

        # Get container name
        print("Finding database container...")
        stdin, stdout, stderr = ssh.exec_command("docker ps --format '{{.Names}}' | grep db")
        container_name = stdout.read().decode().strip()
        
        if not container_name:
            print("Trying postgres container...")
            stdin, stdout, stderr = ssh.exec_command("docker ps --format '{{.Names}}' | grep postgres")
            container_name = stdout.read().decode().strip()

        if not container_name:
            # Fallback to a common name if grep fails
            container_name = "freedombrocker-datasaur-db-1"
            print(f"Container not found via grep, using fallback: {container_name}")
        else:
            # Take first match if multiple
            container_name = container_name.split('\n')[0]
            print(f"Found container: {container_name}")

        # Execute SQL via docker exec
        # We'll use a temp file on the server for safety or pipe it
        print("Executing migration...")
        
        # Escaping quotes for shell
        escaped_sql = sql_content.replace("'", "'\\''")
        
        # Command to run psql inside container
        # Note: we use -v ON_ERROR_STOP=1 to catch errors
        cmd = f"docker exec -i {container_name} psql -U fire_user -d fire_db -v ON_ERROR_STOP=1"
        
        stdin, stdout, stderr = ssh.exec_command(cmd)
        stdin.write(sql_content)
        stdin.channel.shutdown_write()
        
        output = stdout.read().decode()
        error = stderr.read().decode()
        
        if error:
            print("Errors/Warnings:")
            print(error)
            if "ERROR:" in error:
                print("Migration failed with errors.")
                sys.exit(1)
        
        print("Output:")
        print(output)
        print("Migration applied successfully.")
        
        ssh.close()
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()
