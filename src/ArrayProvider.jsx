import { Component, Fragment } from 'react';

export default class ArrayProvider extends Component {
  render() {
    const { data = [], variables, doFilterAndSort } = this.props;
    const { after = 0, first = 10 } = variables;
    const filtered = doFilterAndSort(data, variables);

    return (
      <Fragment>
        {this.props.children({
          data: {
            arrayProviderResult: {
              edges: filtered.slice(after, after + first),
              totalCount: filtered.length,
              pageInfo: {
                hasPreviousPage: after !== 0,
                hasNextPage: after + first < filtered.length,
                endCursor: after + first,
              },
            },
          },
          loading: false,
          errors: null,
          refetch: () => null,
        })}
      </Fragment>
    );
  }
}
