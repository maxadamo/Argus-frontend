import React from 'react';
import ReactTable from 'react-table';
import './table.css';
import 'react-table/react-table.css';


type AlertsProps = {
  alerts: any;
  noDataText: string;
};

//function formatDate(dateString: string):string {
//  2014-09-15T11:25:42.833000+02:00
//}

const Table: React.FC<AlertsProps> = props => {
  const columns: any = [
    {
      Header: 'Timestamp',
      accessor: 'timestamp'
    },
    { Header: 'Problem type', accessor: 'problem_type.name' },
    { Header: 'Description', accessor: 'description' },
    { Header: 'Object', accessor: 'object.name' },
    { Header: 'Parent object', accessor: 'parent_object.name' },
    { Header: 'Source', accessor: 'source.type' },
    {
      Header: 'Details URL',
      accessor: 'details_url',
      Cell: (row: { value: string }) => (
        <a href={row.value} rel="noopener noreferrer" target='_blank'>
          {' '}
          {row.value}{' '}
        </a>
      )
    }
  ];

  return (
    <ReactTable
      defaultSorted={[
        {
          id: 'timestamp',
          desc: true
        }
      ]}
      columns={columns}
      loading={false}
      noDataText={props.noDataText}
      data={props.alerts}
      pageSize={props.alerts.length}
      showPaginationBottom={false} />
  );
};

export default Table;