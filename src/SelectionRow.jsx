// MIT License
//
// Copyright (c) 2020 Kubos Corporation
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

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
