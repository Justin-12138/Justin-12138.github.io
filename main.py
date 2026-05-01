class DB_connect:
    db_name = "MySQL"
    def __init__(self):
        self.host = "localhost"
        self.user = "root"
        self.password = "password"
        self.database = "my_database"
        self.port = 3306
        self.max_connections = 20

if __name__ == "__main__":
    db = DB_connect()
    print(db.database)
    print(DB_connect.db_name)
