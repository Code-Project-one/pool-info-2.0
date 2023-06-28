const poolInfoDiv = document.querySelector('.pool-info');
// Retrieve the timestamp query parameter from the URL
const urlParams = new URLSearchParams(window.location.search);
const timestamp = urlParams.get('timestamp');

fetch(`/api/pool_info?timestamp=${timestamp}`)
  .then(response => response.json())
  .then(data => {
    const poolInfo = data[0];
    const metaJson = poolInfo.meta_json;

    // Create the HTML elements for pool information
    const table = document.createElement('table');

    const createTableRow = (label, value) => {
      const row = document.createElement('tr');

      const labelCell = document.createElement('td');
      labelCell.textContent = label;

      const valueCell = document.createElement('td');
      valueCell.innerHTML = value;

      row.appendChild(labelCell);
      row.appendChild(valueCell);

      return row;
    };

    // Add rows for each pool information key-value pair
    table.appendChild(createTableRow('Pool Name', metaJson.name));
    table.appendChild(createTableRow('Ticker', metaJson.ticker));
    table.appendChild(createTableRow('Homepage', `<a href="${metaJson.homepage}">${metaJson.homepage}</a>`));
    table.appendChild(createTableRow('Description', metaJson.description));

    // Append the table to the poolInfoDiv
    poolInfoDiv.appendChild(table);

    // Calculate ADA value from Lovelace
    const lovelaceToAda = value => `${(value / 1000000).toFixed(2)} ADA`;

    // Calculate percentage from decimal
    const decimalToPercentage = value => (value * 100).toFixed(2) + '%';

    // Create an object to map keys to human-readable labels
    const keyLabels = {
      pool_status: 'Pool Status',
      pool_id_bech32: 'Pool ID (bech32)',
      pool_id_hex: 'Pool ID hex',
      reward_addr: 'Reward Address',
      owners: 'Owners',
      margin: 'Margin',
      fixed_cost: 'Fixed Cost',
      pledge: 'Active Pledge',
      live_pledge: 'Live Pledge',
      live_stake: 'Live Stake',
      active_stake: 'Active Stake',
      block_count: 'Minted Block/s',
      live_delegators: 'Delegators',
      live_saturation: 'Saturation'
    };

    // Create an array of pool information keys to be displayed gradually
    const poolInfoKeys = Object.keys(keyLabels);

    // Function to display pool information gradually
    const displayPoolInfo = (index) => {
      if (index >= poolInfoKeys.length) {
        // Once all pool information is displayed, start loading the hash and pinging
        loadHashAndPinging();
        return;
      }

      const key = poolInfoKeys[index];
      const value = poolInfo[key];

      const formattedValue =
        key === 'margin' ? decimalToPercentage(value) :
        ['fixed_cost', 'pledge', 'live_pledge', 'live_stake', 'active_stake'].includes(key) ? lovelaceToAda(value) :
        value;

      const keyLabel = keyLabels[key];
      table.appendChild(createTableRow(keyLabel, formattedValue));

      // Increment index and recursively call the function with a delay of 500 milliseconds
      setTimeout(() => displayPoolInfo(index + 1), 500);
    };

    const loadHashAndPinging = () => {
      fetch('/api/calculate_hash')
        .then(response => response.json())
        .then(data => {
          const metaHash = data.metaHash;
          const calculatedHash = data.calculatedHash;
          const isValid = data.isValid;
    
          // Add rows for hash and validity
          table.appendChild(createTableRow('Meta Hash', metaHash));
          table.appendChild(createTableRow('Calculated Hash', calculatedHash));
    
          // Create the row for Validity and set the color based on the isValid flag
          const validityRow = createTableRow('Validity', isValid ? 'Valid' : 'Invalid');
          validityRow.classList.add(isValid ? 'validity-valid' : 'validity-invalid');
          table.appendChild(validityRow);
    
          // Start pinging relays
          pingRelays();
        })
        .catch(error => {
          console.error('An error occurred while calculating hash:', error);
        });
    };
    

    // Function to ping relays
    const pingRelays = () => {
      fetch('/api/pool_info')
        .then(response => response.json())
        .then(data => {
          const relays = data[0].relays.filter(relay => relay.dns || relay.srv || relay.ipv4 || relay.ipv6 || relay.port);

          relays.forEach(relay => {
            let host;
            if (relay.dns) {
              host = relay.dns;
            } else if (relay.srv) {
              host = relay.srv;
            } else if (relay.ipv4) {
              host = relay.ipv4;
            } else if (relay.ipv6) {
              host = relay.ipv6;
            }

            fetch(`/api/ping?host=${host}&port=${relay.port}`)
              .then(response => response.json())
              .then(data => {
                const { inputHost, alive, times, min, max, avg, packetLoss } = data;

                // Create the HTML elements for ping results
                const relayInfoRow = createTableRow('Relay', `${inputHost}:${relay.port}`);
                const aliveInfoRow = createTableRow('Alive', alive);
                const timesInfoRow = createTableRow('Ping Times', times.join('ms, ') + 'ms');
                const minMaxAvgInfoRow = createTableRow('Minimum/Maximum/Average', `${min}ms / ${max}ms / ${avg}ms`);
                const packetLossInfoRow = createTableRow('Packet Loss', `${packetLoss}%`);

                // Apply colors based on conditions
                if (alive) {
                  aliveInfoRow.classList.add('ping-success');
                } else {
                  aliveInfoRow.classList.add('ping-failure');
                }

                // Apply colors based on packet loss percentage
           // if (packetLoss === 0) {
             // packetLossInfoRow.classList.add('packet-loss-success');
           // } else if (packetLoss === 100) {
            //  packetLossInfoRow.classList.add('packet-loss-failure');
           // } else {
             //packetLossInfoRow.classList.add('packet-loss-warning');
           // }

                // Append ping results to the table
                table.appendChild(relayInfoRow);
                table.appendChild(aliveInfoRow);
                table.appendChild(timesInfoRow);
                table.appendChild(minMaxAvgInfoRow);
                table.appendChild(packetLossInfoRow);
              })
              .catch(error => {
                console.error('An error occurred while pinging relay:', error);
              });
          });
        })
        .catch(error => {
          console.error('An error occurred while fetching relay information:', error);
        });
    };

    // Start displaying pool information gradually
    displayPoolInfo(0);
  })
  .catch(error => {
    console.error('An error occurred while fetching pool information:', error);
  });