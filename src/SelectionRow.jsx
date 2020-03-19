import React, { Component } from 'react';
import { Mutation } from 'react-apollo';
import {
  Collapse,
  Typography,
  Grid,
  IconButton,
  withStyles,
} from '@material-ui/core';
import { Delete } from '@material-ui/icons';

export const styles = theme => ({
  alignRight: {
    textAlign: 'right',
  },
  hiddenRow: {
    height: 0,
  },
  selectionRow: {
    color: theme.palette.secondary.contrastText,
    backgroundColor: theme.palette.secondary.dark,
    paddingTop: theme.spacing.unit,
    paddingBottom: theme.spacing.unit,
    paddingLeft: theme.spacing.double,
    paddingRight: theme.spacing.half,
  },
});

class SelectionRow extends Component {
  render() {
    const {
      classes,
      changeAllRows,
      refetchQuery,
      getVariables,
      resolveMutation,
      deleteQuery,
      selected = [],
    } = this.props;
    const numSelected = selected.length;

    return (
      <Mutation
        mutation={deleteQuery}
        onCompleted={data => {
          changeAllRows('none');
          resolveMutation(data);
        }}
        refetchQueries={[{ query: refetchQuery, variables: getVariables() }]}
      >
        {mutation => (
          <Collapse
            className={numSelected ? classes.selectionRow : classes.hiddenRow}
            collapsedHeight="0px"
            in={!!numSelected}
          >
            <Grid container alignItems="center">
              <Grid item xs={6}>
                <Typography>{numSelected} Selected</Typography>
              </Grid>
              <Grid className={classes.alignRight} item xs={6}>
                <IconButton
                  onClick={() => mutation({ variables: { ids: selected } })}
                >
                  <Delete />
                </IconButton>
              </Grid>
            </Grid>
          </Collapse>
        )}
      </Mutation>
    );
  }
}

export default withStyles(styles)(SelectionRow);
