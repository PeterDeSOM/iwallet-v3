// Copyright (c) 2013-2017 The btcsuite developers
// Copyright (c) 2015-2017 The Decred developers
// Use of this source code is governed by an ISC
// license that can be found in the LICENSE file.

package main

import (
	"bytes"
	"fmt"

	"github.com/btcsuite/btcd/btcjson"
	"github.com/btcsuite/btcd/wire"
)

// handleDecodePsbt handles decodepsbt commands.
func handleDecodePsbt(s *rpcServer, cmd interface{}, closeChan <-chan struct{}) (interface{}, error) {
	c := cmd.(*btcjson.DecodePsbtCmd)

	// Deserialize the psbt.
	// base64Str := c.Base64Psbt
	// if len(base64Str)%2 != 0 {
	// 	base64Str = "0" + base64Str
	// }
	// serializedPsbt, err := base64.DecodeString(serializedPsbt)
	// if err != nil {
	// 	// return nil, rpcDecodeHexError(base64Str)
	// 	return nil, err
	// }

	var mtx wire.MsgTx
	err = mtx.Deserialize(bytes.NewReader(c.Base64Psbt))
	if err != nil {
		return nil, &btcjson.RPCError{
			Code:    btcjson.ErrRPCDeserialization,
			Message: "TX decode failed: " + err.Error(),
		}
	}

	fmt.Printf("STATE ps: %+v\n", mtx)

	// Create and return the result.
	txReply := btcjson.DecodePsbtResult{
		Txid:     mtx.TxHash().String(),
		Version:  mtx.Version,
		Locktime: mtx.LockTime,
		Vin:      createVinList(&mtx),
		Vout:     createVoutList(&mtx, s.cfg.ChainParams, nil),
	}
	return txReply, nil
}
