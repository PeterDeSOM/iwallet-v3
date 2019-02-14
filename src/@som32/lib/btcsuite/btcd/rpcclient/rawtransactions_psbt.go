// Copyright (c) 2019 The Crypblorm Som32
// Use of this source code is governed by an ISC
// license that can be found in the LICENSE file.

package rpcclient

import (
	"encoding/json"

	"github.com/btcsuite/btcd/btcjson"
)

// FutureDecodePsbtResult is a future promise to deliver the result
// of a DecodePsbtAsync RPC invocation (or an applicable error).
type FutureDecodePsbtResult chan *response

// Receive waits for the response promised by the future and returns information
// about a transaction given its serialized bytes.
func (r FutureDecodePsbtResult) Receive() (*btcjson.DecodePsbtResult, error) {
	res, err := receiveFuture(r)
	if err != nil {
		return nil, err
	}

	var i interface{}
	err = json.Unmarshal(res, &i)
	if err != nil {
		return nil, err
	}

	// Unmarshal result as a DecodePsbt result object.
	var decodedPsbtResult btcjson.DecodePsbtResult
	err = json.Unmarshal(res, &decodedPsbtResult)
	if err != nil {
		return nil, err
	}

	return &decodedPsbtResult, nil
}

// DecodePsbtAsync returns an instance of a type that can be used to
// get the result of the RPC at some future time by invoking the Receive
// function on the returned instance.
//
// See DecodePsbt for the blocking version and more details.
func (c *Client) DecodePsbtAsync(psbt string) FutureDecodePsbtResult {
	// base64Psbt := base64.StdEncoding.EncodeToString(serializedPsbt)
	cmd := btcjson.NewDecodePsbtCmd(psbt)
	return c.sendCmd(cmd)
}

// DecodePsbt returns information about a psbt given itsserialized bytes.
func (c *Client) DecodePsbt(psbt string) (*btcjson.DecodePsbtResult, error) {
	return c.DecodePsbtAsync(psbt).Receive()
}
