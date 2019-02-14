// Copyright (c) 2019 The Crypblorm Som32
// Use of this source code is governed by an ISC
// license that can be found in the LICENSE file.

// NOTE: This file is intended to house the RPC commands that are supported by
// a chain server.

package btcjson

// DecodePsbtCmd defines the DecodePsbt JSON-RPC command.
type DecodePsbtCmd struct {
	Base64Psbt string
}

// NewDecodePsbtCmd returns a new instance which can be used to issue
// a DecodePsbt JSON-RPC command.
func NewDecodePsbtCmd(psbt string) *DecodePsbtCmd {
	return &DecodePsbtCmd{
		Base64Psbt: psbt,
	}
}
