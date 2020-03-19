// This file is pseudo code.

class UserTable extends Component {
  renderRows = data => {
    const users = getUsers(data);

    return users.map(user => (
      <Grid container alignItems="center" key={user.id}>
        <Grid item xs={3}>
          {user.name}
        </Grid>
        <Grid item xs={3}>
          {user.email}
        </Grid>
        <Grid item xs={3}>
          {user.nickname}
        </Grid>
        <Grid item xs={3}>
          <div>
            <IconButton onClick={() => editUser(user)}>
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => deleteUser(user)}>
              <DeleteIcon />
            </IconButton>
          </div>
        </Grid>
      </Grid>
    ));
  };

  render() {
    const columnGroups = [
      {
        width: 12,
        columns: [
          {
            name: 'Name',
            width: 3,
          },
          {
            name: 'Email',
            width: 3,
            sortKey: 'EMAIL',
          },
          {
            name: 'Nickname',
            width: 3,
            sortKey: 'NICKNAME',
          },
          {
            name: 'Actions',
            width: 3,
          },
        ],
      },
    ];

    return (
        <Table
          columnGroups={columnGroups}
          variables={{}}
          query={SomeQuery}
          renderRows={this.renderRows}
          customClasses={{}}
          pollInterval={0}
          dataPath="users"
        />
    );
  }
}
